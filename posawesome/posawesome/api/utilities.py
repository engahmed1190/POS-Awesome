# -*- coding: utf-8 -*-
# Copyright (c) 2020, Youssef Restom and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import json
import frappe
from frappe.utils import cstr, add_to_date, get_datetime
from typing import List, Dict
import time
import os
import psutil
import functools
from frappe import _
from .utils import get_item_groups


def get_version():
    """Get ERPNext version number."""
    try:
        app_version = frappe.get_attr("erpnext.__version__")
        if app_version:
            # Convert version string to number (e.g., "14.0.0" -> 14)
            version_number = int(app_version.split(".")[0])
            return version_number
    except Exception:
        pass

    # Fallback to branch name check
    branch_name = get_app_branch("erpnext")
    if branch_name:
        for version in ["14", "13", "12"]:
            if version in branch_name:
                return int(version)

    # Default to latest supported version
    return 14


def get_app_branch(app):
    """Returns branch of an app"""
    import subprocess

    try:
        branch = subprocess.check_output(
            "cd ../apps/{0} && git rev-parse --abbrev-ref HEAD".format(app), shell=True
        )
        branch = branch.decode("utf-8")
        branch = branch.strip()
        return branch
    except Exception:
        return ""


def get_root_of(doctype):
    """Get root element of a DocType with a tree structure"""
    result = frappe.db.sql(
        """select t1.name from `tab{0}` t1 where
		(select count(*) from `tab{1}` t2 where
			t2.lft < t1.lft and t2.rgt > t1.rgt) = 0
		and t1.rgt > t1.lft""".format(
            doctype, doctype
        )
    )
    return result[0][0] if result else None


def get_child_nodes(group_type, root):
    lft, rgt = frappe.db.get_value(group_type, root, ["lft", "rgt"])
    return frappe.get_all(
        group_type,
        filters={"lft": [">=", lft], "rgt": ["<=", rgt]},
        fields=["name", "lft", "rgt"],
        order_by="lft",
    )


def get_item_group_condition(pos_profile, item_groups=None):
    cond = " and 1=1"
    item_groups = item_groups or get_item_groups(pos_profile)
    if item_groups:
        cond = " and item_group in (%s)" % (", ".join(["%s"] * len(item_groups)))
        return cond % tuple(item_groups)

    return cond


def add_taxes_from_tax_template(item, parent_doc):
    accounts_settings = frappe.get_cached_doc("Accounts Settings")
    add_taxes_from_item_tax_template = (
        accounts_settings.add_taxes_from_item_tax_template
    )
    if item.get("item_tax_template") and add_taxes_from_item_tax_template:
        item_tax_template = item.get("item_tax_template")
        taxes_template_details = frappe.get_all(
            "Item Tax Template Detail",
            filters={"parent": item_tax_template},
            fields=["tax_type"],
        )

        for tax_detail in taxes_template_details:
            tax_type = tax_detail.get("tax_type")

            found = any(tax.account_head == tax_type for tax in parent_doc.taxes)
            if not found:
                tax_row = parent_doc.append("taxes", {})
                tax_row.update(
                    {
                        "description": str(tax_type).split(" - ")[0],
                        "charge_type": "On Net Total",
                        "account_head": tax_type,
                    }
                )

                if parent_doc.doctype == "Purchase Order":
                    tax_row.update({"category": "Total", "add_deduct_tax": "Add"})
                tax_row.db_insert()


def set_batch_nos_for_bundels(doc, warehouse_field, throw=False):
    """Automatically select `batch_no` for outgoing items in item table"""
    for d in doc.packed_items:
        qty = d.get("stock_qty") or d.get("transfer_qty") or d.get("qty") or 0
        has_batch_no = frappe.db.get_value("Item", d.item_code, "has_batch_no")
        warehouse = d.get(warehouse_field, None)
        if has_batch_no and warehouse and qty > 0:
            if not d.batch_no:
                d.batch_no = get_batch_no(
                    d.item_code, warehouse, qty, throw, d.serial_no
                )
            else:
                batch_qty = get_batch_qty(batch_no=d.batch_no, warehouse=warehouse)
                if flt(batch_qty, d.precision("qty")) < flt(qty, d.precision("qty")):
                    frappe.throw(
                        _(
                            "Row #{0}: The batch {1} has only {2} qty. Please select another batch which has {3} qty available or split the row into multiple rows, to deliver/issue from multiple batches"
                        ).format(d.idx, d.batch_no, batch_qty, qty)
                    )


def get_company_domain(company):
    return frappe.get_cached_value("Company", cstr(company), "domain")


@frappe.whitelist()
def clear_user_cache():
    """Clear the cache for the current user."""
    try:
        user = frappe.session.user
        frappe.clear_cache(user=user)
        return {"success": True, "message": "User cache cleared successfully"}
    except Exception as e:
        frappe.log_error(f"Error clearing user cache: {str(e)}")
        return {"success": False, "message": "Failed to clear user cache"}

@frappe.whitelist()
def get_selling_price_lists():
    """Return all selling price lists"""
    return frappe.get_all(
        "Price List",
        filters={"selling": 1},
        fields=["name"],
        order_by="name",
    )


@frappe.whitelist()
def get_app_info() -> Dict[str, List[Dict[str, str]]]:
    """
    Return a list of installed apps and their versions.
    """
    # Get installed apps using Frappe's built-in function
    installed_apps = frappe.get_installed_apps()

    # Get app versions
    apps_info = []
    for app_name in installed_apps:
        try:
            # Get app version from hooks or __init__.py
            app_version = frappe.get_attr(f"{app_name}.__version__") or "Unknown"
        except (AttributeError, ImportError):
            app_version = "Unknown"

        apps_info.append({"app_name": app_name, "installed_version": app_version})

    return {"apps": apps_info}


def ensure_child_doctype(doc, table_field, child_doctype):
    """Ensure child rows have the correct doctype set."""
    for row in doc.get(table_field, []):
        if not row.get("doctype"):
            row.doctype = child_doctype


@frappe.whitelist()
def get_sales_person_names():
    import json

    print("Fetching sales persons...")
    try:
        sales_persons = frappe.get_list(
            "Sales Person",
            filters={"enabled": 1},
            fields=["name", "sales_person_name"],
            limit_page_length=100000,
        )
        print(f"Found {len(sales_persons)} sales persons: {json.dumps(sales_persons)}")
        return sales_persons
    except Exception as e:
        print(f"Error fetching sales persons: {str(e)}")
        frappe.log_error(
            f"Error fetching sales persons: {str(e)}", "POS Sales Person Error"
        )
        return []


@frappe.whitelist()
def get_language_options():
    """Return newline separated language codes from translations directories of all apps.

    Always include English (``en``) in the list so that users can explicitly
    select it in the POS profile.
    """
    import os

    languages = {"en"}

    def normalize(code: str) -> str:
        """Return language code normalized for comparison."""
        return code.strip().lower().replace("_", "-")

    # Collect languages from translation CSV files
    for app in frappe.get_installed_apps():
        translations_path = frappe.get_app_path(app, "translations")
        if os.path.exists(translations_path):
            for filename in os.listdir(translations_path):
                if filename.endswith(".csv"):
                    languages.add(normalize(os.path.splitext(filename)[0]))

    # Also include languages from the Translation doctype, if available
    if frappe.db.table_exists("Translation"):
        rows = frappe.db.sql(
            "SELECT DISTINCT language FROM `tabTranslation` WHERE language IS NOT NULL"
        )
        for (language,) in rows:
            languages.add(normalize(language))

    # Normalize to lowercase and deduplicate, then sort for consistent order
    return "\n".join(sorted(languages))


@frappe.whitelist()
def get_translation_dict(lang: str) -> dict:
    """Return translations for the given language from all installed apps."""
    from frappe.translate import get_translations_from_csv

    if lang == "en":
        # English is the base language and does not have a separate
        # translation file. Return an empty dict to avoid file lookups.
        return {}

    translations = {}

    for app in frappe.get_installed_apps():
        try:
            messages = get_translations_from_csv(lang, app) or {}
            translations.update(messages)
        except Exception:
            pass

    # Include translations stored in the Translation doctype, if present
    if frappe.db.table_exists("Translation"):
        rows = frappe.db.sql(
            """
	        SELECT source_text, translated_text
	        FROM `tabTranslation`
	        WHERE language = %s
	    """,
            (lang,),
        )
        for source, target in rows:
            translations[source] = target

    return translations


@frappe.whitelist()
def get_pos_profile_tax_inclusive(pos_profile: str):
    """Return the 'posa_tax_inclusive' setting for the given POS Profile."""
    if not pos_profile or not pos_profile.strip():
        return None
    return frappe.get_cached_value("POS Profile", pos_profile, "posa_tax_inclusive")


@frappe.whitelist()
def get_database_usage():
    db_size = None
    db_connections = None
    db_slow_queries = None
    db_engine = None
    db_version = None
    db_table_count = None
    db_total_rows = None
    db_top_tables = []
    try:
        db_type = frappe.conf.get("db_type") or frappe.db.db_type
        db_engine = db_type
        db_version = frappe.db.sql("SELECT VERSION();")[0][0]
        if db_type == "postgres":
            db_name = frappe.conf.get("db_name") or frappe.db.get_database_name()
            db_size = frappe.db.sql("SELECT pg_database_size(%s)", (db_name,))[0][0]
            db_size = int(db_size)
            db_connections = frappe.db.sql("SELECT count(*) FROM pg_stat_activity;")[0][
                0
            ]
            db_slow_queries = frappe.db.sql(
                "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 second';"
            )[0][0]
            db_table_count = frappe.db.sql(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
            )[0][0]
            db_total_rows = frappe.db.sql(
                "SELECT sum(reltuples)::bigint FROM pg_class WHERE relkind='r';"
            )[0][0]
            db_top_tables = frappe.db.sql(
                """
                SELECT relname, pg_total_relation_size(relid) AS size
                FROM pg_catalog.pg_statio_user_tables
                ORDER BY size DESC LIMIT 3
            """
            )
            db_top_tables = [{"name": t[0], "size": int(t[1])} for t in db_top_tables]
        elif db_type == "mariadb" or db_type == "mysql":
            db_name = frappe.conf.get("db_name") or frappe.db.get_database_name()
            db_size = frappe.db.sql(
                "SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = %s",
                (db_name,),
            )[0][0]
            db_size = int(db_size)
            db_connections = frappe.db.sql(
                "SHOW STATUS WHERE variable_name = 'Threads_connected';"
            )[0][1]
            db_connections = int(db_connections)
            db_slow_queries = frappe.db.sql(
                "SHOW GLOBAL STATUS WHERE variable_name = 'Slow_queries';"
            )[0][1]
            db_slow_queries = int(db_slow_queries)
            db_table_count = frappe.db.sql(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = %s",
                (db_name,),
            )[0][0]
            db_total_rows = frappe.db.sql(
                "SELECT SUM(TABLE_ROWS) FROM information_schema.tables WHERE table_schema = %s",
                (db_name,),
            )[0][0]
            db_top_tables = frappe.db.sql(
                """
                SELECT table_name, (data_length + index_length) AS size
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY size DESC LIMIT 3
            """,
                (db_name,),
            )
            db_top_tables = [{"name": t[0], "size": int(t[1])} for t in db_top_tables]
    except Exception as db_exc:
        frappe.log_error(f"DB stats error: {db_exc}")
        db_size = None
        db_connections = None
        db_slow_queries = None
        db_engine = None
        db_version = None
        db_table_count = None
        db_total_rows = None
        db_top_tables = []
    return {
        "db_size": db_size,
        "db_connections": db_connections,
        "db_slow_queries": db_slow_queries,
        "db_engine": db_engine,
        "db_version": db_version,
        "db_table_count": db_table_count,
        "db_total_rows": db_total_rows,
        "db_top_tables": db_top_tables,
    }


@frappe.whitelist()
def get_server_usage():
    try:

        cpu_percent = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        memory_percent = mem.percent
        memory_total = mem.total
        memory_used = mem.used
        memory_available = mem.available
        load_avg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)
        uptime = time.time() - psutil.boot_time()
    except ImportError:
        cpu_percent = None
        memory_percent = None
        memory_total = None
        memory_used = None
        memory_available = None
        load_avg = (None, None, None)
        uptime = None
    except Exception as e:
        frappe.log_error(f"Server usage error: {e}")
        cpu_percent = None
        memory_percent = None
        memory_total = None
        memory_used = None
        memory_available = None
        load_avg = (None, None, None)
        uptime = None
    return {
        "cpu_percent": cpu_percent,
        "memory_percent": memory_percent,
        "memory_total": memory_total,
        "memory_used": memory_used,
        "memory_available": memory_available,
        "load_avg": load_avg,
        "uptime": uptime,
    }


# Cache for language data
_LANGUAGE_CACHE = {
    "languages": None,
    "last_updated": None,
    "cache_duration": 300,  # 5 minutes
}

# Language display names mapping (moved to module level for reuse)
LANGUAGE_NAMES = {
    "en": {"name": "English", "native_name": "English"},
    "ar": {"name": "Arabic", "native_name": "العربية"},
    "es": {"name": "Spanish", "native_name": "Español"},
    "pt": {"name": "Portuguese", "native_name": "Português"},
    "fr": {"name": "French", "native_name": "Français"},
    "de": {"name": "German", "native_name": "Deutsch"},
    "it": {"name": "Italian", "native_name": "Italiano"},
    "nl": {"name": "Dutch", "native_name": "Nederlands"},
    "pl": {"name": "Polish", "native_name": "Polski"},
    "ru": {"name": "Russian", "native_name": "Русский"},
    "zh": {"name": "Chinese", "native_name": "中文"},
    "ja": {"name": "Japanese", "native_name": "日本語"},
    "ko": {"name": "Korean", "native_name": "한국어"},
    "hi": {"name": "Hindi", "native_name": "हिन्दी"},
    "tr": {"name": "Turkish", "native_name": "Türkçe"},
}


def _is_cache_valid():
    """Check if language cache is still valid."""
    if not _LANGUAGE_CACHE["last_updated"]:
        return False

    cache_time = _LANGUAGE_CACHE["last_updated"]
    expiry_time = add_to_date(cache_time, seconds=_LANGUAGE_CACHE["cache_duration"])
    return get_datetime() < expiry_time


def _update_language_cache(languages):
    """Update the language cache."""
    _LANGUAGE_CACHE["languages"] = languages
    _LANGUAGE_CACHE["last_updated"] = get_datetime()


@frappe.whitelist()
def get_available_languages():
    """Get list of available languages with caching."""
    # Return cached data if valid
    if _is_cache_valid() and _LANGUAGE_CACHE["languages"]:
        return _LANGUAGE_CACHE["languages"]

    languages = []

    try:
        translations_path = frappe.get_app_path("posawesome", "translations")
        if os.path.exists(translations_path):
            # Use os.scandir for better performance
            with os.scandir(translations_path) as entries:
                for entry in entries:
                    if entry.is_file() and entry.name.endswith(".csv"):
                        lang_code = os.path.splitext(entry.name)[0]
                        lang_info = LANGUAGE_NAMES.get(lang_code)
                        if lang_info:
                            languages.append(
                                {
                                    "code": lang_code,
                                    "name": lang_info["name"],
                                    "native_name": lang_info["native_name"],
                                }
                            )
                        else:
                            # Fallback for unknown languages
                            languages.append(
                                {
                                    "code": lang_code,
                                    "name": lang_code.upper(),
                                    "native_name": lang_code.upper(),
                                }
                            )

        # Always include English as fallback
        if not any(lang["code"] == "en" for lang in languages):
            languages.insert(
                0, {"code": "en", "name": "English", "native_name": "English"}
            )

        # Sort and cache
        languages = sorted(languages, key=lambda x: x["code"])
        _update_language_cache(languages)

        return languages

    except Exception as e:
        frappe.log_error(f"Error getting available languages: {str(e)}")
        # Return minimal fallback
        fallback = [{"code": "en", "name": "English", "native_name": "English"}]
        _update_language_cache(fallback)
        return fallback


@functools.lru_cache(maxsize=128)
def _get_user_language_cached(user):
    """Get user language with LRU cache."""
    if user == "Guest":
        return "en"
    return frappe.get_cached_value("User", user, "language") or "en"


@frappe.whitelist()
def get_current_user_language():
    """Get current user's language with optimized caching."""
    try:
        user = frappe.session.user
        if user == "Guest":
            return {
                "success": False,
                "message": "Guest users cannot have language preferences",
            }

        # Get user's language preference
        user_language = frappe.db.get_value("User", user, "language")
        if not user_language:
            # Try to get from system defaults
            user_language = frappe.db.get_default("lang")

        # Fallback to English
        if not user_language:
            user_language = "en"

        # Get available languages
        available_languages = get_available_languages()

        # Find current language details
        current_lang = next(
            (lang for lang in available_languages if lang["code"] == user_language),
            None,
        )

        # Get POS Profile settings if available
        pos_profile = None
        try:
            from .utils import get_active_pos_profile

            profile_data = get_active_pos_profile(user)
            if profile_data and isinstance(profile_data, dict):
                pos_profile = profile_data.get("name")
        except Exception as e:
            frappe.log_error(f"Error getting active POS Profile: {str(e)}")

        return {
            "success": True,
            "user": user,
            "language_code": user_language,
            "language_name": (
                current_lang["name"] if current_lang else user_language.upper()
            ),
            "native_name": (
                current_lang["native_name"] if current_lang else user_language.upper()
            ),
            "available_languages": available_languages,
            "pos_profile": pos_profile,
        }

    except Exception as e:
        frappe.log_error(f"Error getting current user language: {str(e)}")
        return {"success": False, "message": "Failed to get language"}


@frappe.whitelist()
def set_current_user_language(*args, **kwargs):
    """Main function to set user language and optionally update POS Profile settings.
    
    Can be called with either positional or named arguments:
    - Positional: (lang_code, pos_profile, number_system)
    - Named: lang_code=value, pos_profile=value, number_system=value
    """
    # Handle both positional and named arguments
    if args:
        lang_code = args[0] if len(args) > 0 else None
        pos_profile = args[1] if len(args) > 1 else None
        number_system = args[2] if len(args) > 2 else None
    else:
        lang_code = kwargs.get('lang_code')
        pos_profile = kwargs.get('pos_profile')
        number_system = kwargs.get('number_system')

    # Validate required arguments
    if not lang_code:
        frappe.throw("Language code is required")
    try:
        user = frappe.session.user
        if user == "Guest":
            return {
                "success": False,
                "message": "Guest users cannot set language preferences",
            }

        # Validate language code
        available_languages = get_available_languages()
        valid_codes = [lang["code"] for lang in available_languages]

        if lang_code not in valid_codes:
            return {
                "success": False,
                "message": f"Language '{lang_code}' is not supported",
            }

        # Set user language
        frappe.db.set_value("User", user, "language", lang_code, update_modified=False)

        # Update POS Profile if provided
        pos_profile_updates = {}
        if pos_profile:
            pos_profile_result = set_pos_profile_language_and_number_system(
                pos_profile, language=lang_code, number_system=number_system
            )
            if not pos_profile_result.get("success"):
                return pos_profile_result
            pos_profile_updates = pos_profile_result.get("updates", {})

        # Commit all changes
        frappe.db.commit()

        # Clear caches
        clear_user_cache()  # Use our new function to clear user cache
        _get_user_language_cached.cache_clear()
        if pos_profile:
            frappe.clear_document_cache("POS Profile", pos_profile)
            frappe.clear_cache(doctype="POS Profile")

        return {
            "success": True,
            "message": f"Language set to {lang_code}",
            "language": lang_code,
            "pos_profile_updated": bool(pos_profile),
            "pos_profile_updates": pos_profile_updates,
        }

    except Exception as e:
        frappe.log_error(f"Error setting language: {str(e)}")
        return {"success": False, "message": "Failed to set language"}


def _validate_language_code(lang_code):
    """Validate if a language code is valid and supported."""
    if not lang_code:
        return False, "Language code is required"

    if not isinstance(lang_code, str):
        return False, "Language code must be a string"

    # Basic format validation
    if len(lang_code) < 2 or len(lang_code) > 10:
        return False, "Language code must be between 2 and 10 characters"

    # Check if it's in available languages
    try:
        available_languages = get_available_languages()
        valid_codes = [lang["code"] for lang in available_languages]

        if lang_code not in valid_codes:
            return False, f"Language '{lang_code}' is not supported"

        return True, ""
    except Exception as e:
        return False, f"Error validating language code: {str(e)}"


@frappe.whitelist()
def get_language_info(lang_code):
    """Get detailed information about a specific language."""
    try:
        is_valid, error_msg = _validate_language_code(lang_code)
        if not is_valid:
            return {"success": False, "message": error_msg}

        available_languages = get_available_languages()
        language = next(
            (lang for lang in available_languages if lang["code"] == lang_code), None
        )

        # Check translation file
        translations_path = frappe.get_app_path(
            "posawesome", "translations", f"{lang_code}.csv"
        )
        has_translations = os.path.exists(translations_path)

        translation_count = 0
        if has_translations:
            try:
                with open(translations_path, "r", encoding="utf-8") as f:
                    translation_count = sum(1 for _ in f) - 1  # Exclude header
            except Exception:
                pass

        return {
            "success": True,
            "language": language,
            "has_translations": has_translations,
            "translation_count": translation_count,
        }

    except Exception as e:
        frappe.log_error(f"Error getting language info for {lang_code}: {str(e)}")
        return {"success": False, "message": "Failed to get language info"}


@frappe.whitelist()
def get_pos_profile_number_system(pos_profile: str):
    """Return the 'posa_number_system' setting for the given POS Profile."""
    if not pos_profile or not pos_profile.strip():
        return None
    value = frappe.get_cached_value("POS Profile", pos_profile, "posa_number_system")
    return value.title() if value else None


@frappe.whitelist()
def set_pos_profile_language_and_number_system(
    pos_profile: str, language: str = None, number_system: str = None
):
    """Set both language and number system for a POS Profile."""
    try:
        if not pos_profile or not pos_profile.strip():
            return {"success": False, "message": "POS Profile name is required"}

        # Validate POS Profile exists
        if not frappe.db.exists("POS Profile", pos_profile):
            return {
                "success": False,
                "message": f"POS Profile '{pos_profile}' does not exist",
            }

        updates = {}

        # Set language if provided
        if language is not None:
            available_languages = get_available_languages()
            valid_languages = [lang["code"] for lang in available_languages]

            if language not in valid_languages:
                return {
                    "success": False,
                    "message": f"Language '{language}' is not supported. Available: {', '.join(valid_languages)}",
                }
            updates["posa_language"] = language

        # Set number system if provided
        if number_system is not None:
            valid_number_systems = {"Western", "Arabic"}
            # Normalize input to title case for comparison
            normalized_number_system = number_system.title() if number_system else None
            if normalized_number_system not in valid_number_systems:
                return {
                    "success": False,
                    "message": f"Number system '{number_system}' is not supported. Available: {', '.join(valid_number_systems)}",
                }
            updates["posa_number_system"] = normalized_number_system

        if not updates:
            return {"success": False, "message": "No values provided to update"}

        # Update the POS Profile
        frappe.db.set_value("POS Profile", pos_profile, updates, update_modified=False)
        frappe.db.commit()

        # Clear caches
        clear_user_cache()  # Clear user cache first
        frappe.clear_cache(doctype="POS Profile")
        frappe.clear_document_cache("POS Profile", pos_profile)

        return {
            "success": True,
            "message": f"POS Profile '{pos_profile}' updated successfully",
            "updates": updates,
        }

    except Exception as e:
        frappe.log_error(f"Error updating POS Profile {pos_profile}: {str(e)}")
        return {"success": False, "message": f"Failed to update POS Profile: {str(e)}"}


@frappe.whitelist()
def set_pos_profile_language(pos_profile: str, language: str):
    """Set only the language for a POS Profile."""
    return set_pos_profile_language_and_number_system(pos_profile, language=language)


@frappe.whitelist()
def set_pos_profile_number_system(pos_profile: str, number_system: str):
    """Set only the number system for a POS Profile."""
    return set_pos_profile_language_and_number_system(
        pos_profile, number_system=number_system
    )


@frappe.whitelist()
def validate_pos_profile_exists(pos_profile: str):
    """Validate that a POS Profile exists and is accessible."""
    try:
        if not pos_profile or not pos_profile.strip():
            return {"success": False, "message": "POS Profile name is required"}

        # Check if POS Profile exists in database
        if not frappe.db.exists("POS Profile", pos_profile):
            return {
                "success": False,
                "message": f"POS Profile '{pos_profile}' does not exist",
            }

        # Get the profile document to check if it's disabled
        profile_doc = frappe.get_cached_doc("POS Profile", pos_profile)
        if profile_doc.disabled:
            return {
                "success": False,
                "message": f"POS Profile '{pos_profile}' is disabled",
            }

        return {
            "success": True,
            "pos_profile": pos_profile,
            "message": "POS Profile is valid",
        }

    except Exception as e:
        frappe.log_error(f"Error validating POS Profile '{pos_profile}': {str(e)}")
        return {
            "success": False,
            "message": f"Failed to validate POS Profile: {str(e)}",
        }


@frappe.whitelist()
def get_pos_profile_settings(pos_profile=None):
    """Get both language and number system settings for a POS Profile.

    Args:
        pos_profile (str, optional): The name of the POS Profile. If not provided,
            will try to get the active profile for the current user.
    """
    try:
        # If no pos_profile provided, try to get active profile
        if not pos_profile:
            from .utils import get_active_pos_profile

            active_profile = get_active_pos_profile()
            if not active_profile or not isinstance(active_profile, dict):
                return {"success": False, "message": "No active POS Profile found"}
            pos_profile = active_profile.get("name")
            if not pos_profile:
                return {"success": False, "message": "Active POS Profile has no name"}

        # Validate the POS Profile exists
        validation_result = validate_pos_profile_exists(pos_profile)
        if not validation_result.get("success"):
            return validation_result

        # Get current values
        current_language = frappe.get_cached_value(
            "POS Profile", pos_profile, "posa_language"
        )
        current_number_system = frappe.get_cached_value(
            "POS Profile", pos_profile, "posa_number_system"
        )
        if current_number_system:
            current_number_system = current_number_system.title()

        # Get available options
        available_languages = get_available_languages()
        valid_number_systems = ["Western", "Arabic"]

        # Get user's current language
        user_language = (
            frappe.db.get_value("User", frappe.session.user, "language") or "en"
        )

        return {
            "success": True,
            "pos_profile": pos_profile,
            "current_language": current_language or user_language,
            "current_number_system": current_number_system or "Western",
            "available_languages": available_languages,
            "available_number_systems": valid_number_systems,
            "user_language": user_language,
        }

    except Exception as e:
        frappe.log_error(
            f"Error getting POS Profile settings for {pos_profile}: {str(e)}"
        )
        return {
            "success": False,
            "message": f"Failed to get POS Profile settings: {str(e)}",
        }


@frappe.whitelist()
def get_pos_profile_language_settings(pos_profile: str):
    """Get language settings for a POS Profile with validation."""
    try:
        # Validate POS Profile exists
        validation_result = validate_pos_profile_exists(pos_profile)
        if not validation_result.get("success"):
            return validation_result

        # Get current language setting
        current_language = frappe.get_cached_value(
            "POS Profile", pos_profile, "posa_language"
        )

        # Get available languages
        available_languages = get_available_languages()

        # Find current language details
        current_lang = next(
            (lang for lang in available_languages if lang["code"] == current_language),
            None,
        )

        return {
            "success": True,
            "pos_profile": pos_profile,
            "current_language": current_language,
            "current_language_name": (
                current_lang["name"] if current_lang else current_language.upper()
            ),
            "available_languages": available_languages,
        }

    except Exception as e:
        frappe.log_error(
            f"Error getting POS Profile language settings for {pos_profile}: {str(e)}"
        )
        return {
            "success": False,
            "message": f"Failed to get POS Profile language settings: {str(e)}",
        }


@frappe.whitelist()
def set_language_and_number_system(lang_code, pos_profile, number_system=None):
    """Convenience function to set both language and number system using the main set_current_user_language function."""
    return set_current_user_language(lang_code, pos_profile, number_system)


@frappe.whitelist()
def check_pos_profile_status(user=None):
    """Comprehensive check of POS Profile status for a user."""
    try:
        user = user or frappe.session.user
        if not user:
            return {"success": False, "message": "No user provided"}

        # Check if user exists and is enabled
        if not frappe.db.exists("User", user):
            return {"success": False, "message": f"User '{user}' does not exist"}

        user_enabled = frappe.get_cached_value("User", user, "enabled")
        if not user_enabled:
            return {"success": False, "message": f"User '{user}' is disabled"}

        # Try to get active POS Profile
        from .utils import get_active_pos_profile

        active_profile = get_active_pos_profile(user)

        if not active_profile:
            return {
                "success": False,
                "message": "No active POS Profile found",
                "details": {
                    "user": user,
                    "user_enabled": user_enabled,
                    "has_user_specific_profile": False,
                    "has_default_profile": False,
                },
            }

        # Validate the profile
        validation_result = validate_pos_profile_exists(active_profile.get("name"))

        return {
            "success": validation_result.get("success"),
            "message": validation_result.get("message"),
            "pos_profile": (
                active_profile.get("name") if validation_result.get("success") else None
            ),
            "details": {
                "user": user,
                "user_enabled": user_enabled,
                "profile_data": (
                    active_profile if validation_result.get("success") else None
                ),
                "validation_result": validation_result,
            },
        }

    except Exception as e:
        frappe.log_error(f"Error checking POS Profile status for user {user}: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to check POS Profile status: {str(e)}",
        }


@frappe.whitelist()
def get_user_and_pos_settings():
    """Get current user language and POS Profile settings together."""
    try:
        user = frappe.session.user
        if user == "Guest":
            return {"success": False, "message": "Guest users cannot access settings"}

        # Get user language
        user_language = _get_user_language_cached(user)
        available_languages = get_available_languages()

        # Find current language details
        current_lang = next(
            (lang for lang in available_languages if lang["code"] == user_language),
            None,
        )

        # Get POS Profile settings if user has access
        pos_settings = None
        try:
            # Try to get the user's active POS Profile using the utility function
            from .utils import get_active_pos_profile

            active_profile = get_active_pos_profile(user)

            # Validate that we have a valid profile with a name
            if (
                active_profile
                and isinstance(active_profile, dict)
                and active_profile.get("name")
            ):
                pos_profile_name = active_profile["name"]

                # Additional validation: ensure the profile name is not empty
                if pos_profile_name and pos_profile_name.strip():
                    # Validate that the POS Profile actually exists in the database
                    if frappe.db.exists("POS Profile", pos_profile_name):
                        pos_settings = get_pos_profile_settings(pos_profile_name)
                    else:
                        frappe.log_error(
                            f"POS Profile '{pos_profile_name}' returned by get_active_pos_profile but does not exist in database"
                        )
                        pos_settings = {
                            "success": False,
                            "message": f"POS Profile '{pos_profile_name}' not found in database",
                        }
                else:
                    frappe.log_error(
                        f"Invalid POS Profile name returned: '{pos_profile_name}'"
                    )
                    pos_settings = {
                        "success": False,
                        "message": "Invalid POS Profile name",
                    }
            else:
                # No active profile found
                pos_settings = {
                    "success": False,
                    "message": "No active POS Profile found for user",
                }

        except Exception as e:
            frappe.log_error(
                f"Error getting active POS Profile for user {user}: {str(e)}"
            )
            pos_settings = {
                "success": False,
                "message": f"Failed to get active POS Profile: {str(e)}",
            }

        return {
            "success": True,
            "user": user,
            "user_language": {
                "code": user_language,
                "name": current_lang["name"] if current_lang else user_language.upper(),
                "available_languages": available_languages,
            },
            "pos_profile_settings": pos_settings,
        }

    except Exception as e:
        frappe.log_error(f"Error getting user and POS settings: {str(e)}")
        return {"success": False, "message": "Failed to get settings"}

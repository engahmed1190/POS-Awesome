from __future__ import annotations

from functools import cache

import frappe

# Reusable ORM filter to exclude template items
HAS_VARIANTS_EXCLUSION = {"has_variants": 0}


@frappe.whitelist()
def get_active_pos_profile(user=None):
    """Return the active POS profile for the given user."""
    try:
        user = user or frappe.session.user
        if not user:
            frappe.log_error("No user provided to get_active_pos_profile")
            return None

        # First try to get user-specific POS Profile
        profile = frappe.db.get_value("POS Profile", {"user": user}, "name")

        # If no user-specific profile, try to get default from POS Settings
        if not profile:
            profile = frappe.db.get_single_value("POS Settings", "default_pos_profile")

        # Validate that we have a profile
        if not profile:
            frappe.log_error(f"No POS Profile found for user {user}")
            return None

        # Validate that the profile exists in the database
        if not frappe.db.exists("POS Profile", profile):
            frappe.log_error(
                f"POS Profile '{profile}' not found in database for user {user}"
            )
            return None

        # Get the profile document and validate it's not disabled
        profile_doc = frappe.get_cached_doc("POS Profile", profile)
        if profile_doc.disabled:
            frappe.log_error(f"POS Profile '{profile}' is disabled for user {user}")
            return None

        return profile_doc.as_dict()

    except Exception as e:
        frappe.log_error(f"Error getting active POS Profile for user {user}: {str(e)}")
        return None


@frappe.whitelist()
def get_user_pos_profiles(user=None):
    """Get all POS profiles available for a user."""
    try:
        user = user or frappe.session.user
        if not user:
            return {"success": False, "message": "No user provided"}

        # Get all POS profiles where user is assigned
        user_profiles = frappe.db.get_all(
            "POS Profile",
            filters={"user": user},
            fields=["name", "company", "currency", "disabled"],
            as_dict=1,
        )

        # Get default profile from POS Settings
        default_profile = frappe.db.get_single_value("POS Settings", "pos_profile")

        # Mark which profile is default
        for profile in user_profiles:
            profile["is_default"] = profile.name == default_profile

        return {
            "success": True,
            "user": user,
            "user_profiles": user_profiles,
            "default_profile": default_profile,
            "total_profiles": len(user_profiles),
        }

    except Exception as e:
        frappe.log_error(f"Error getting user POS profiles for user {user}: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to get user POS profiles: {str(e)}",
        }


@frappe.whitelist()
def get_default_warehouse(company=None):
    """Return the default warehouse for the given company."""
    company = company or frappe.defaults.get_default("company")
    if not company:
        return None
    warehouse = frappe.db.get_value("Company", company, "default_warehouse")
    if not warehouse:
        warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    return warehouse


@cache
def get_item_groups(pos_profile: str) -> list[str]:
    """Return item groups linked to a POS profile using the ORM.

    Results are cached to avoid duplicate database calls when the same
    profile's item groups are requested multiple times within a process.
    Handles the case where the child DocType is missing by returning an
    empty list instead of raising a database error.
    """
    if not pos_profile:
        return []

    if not frappe.db.exists("DocType", "POS Profile Item Group"):
        return []

    return frappe.get_all(
        "POS Profile Item Group",
        filters={"parent": pos_profile},
        pluck="item_group",
    )

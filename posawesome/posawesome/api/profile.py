import frappe

FIELDS = [
    'posa_cash_mode_of_payment',
    'posa_allow_delete',
    'posa_allow_user_to_edit_rate',
    'posa_allow_user_to_edit_additional_discount',
    'posa_use_percentage_discount',
    'posa_max_discount_allowed',
    'posa_language',
    'posa_default_country'
]

@frappe.whitelist()
def get_profile(user=None, device=None):
    """Return Standalone POS Profile by user or device."""
    user = user or frappe.session.user
    profile_name = frappe.db.get_value('POS Profile User', {'user': user}, 'parent')
    if device:
        profile_name = frappe.db.get_value('POS Profile', {'device_id': device}, 'name') or profile_name
    if not profile_name:
        return None
    if frappe.db.exists('Standalone POS Profile', profile_name):
        return frappe.get_doc('Standalone POS Profile', profile_name).as_dict()
    if frappe.db.exists('POS Profile', profile_name):
        data = frappe.get_doc('POS Profile', profile_name).as_dict()
        return {f: data.get(f) for f in FIELDS}
    return None

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


def execute():
    if not frappe.db.table_exists('Standalone POS Profile'):
        return

    profiles = frappe.get_all('POS Profile', fields=['name', *FIELDS])
    for p in profiles:
        if not frappe.db.exists('Standalone POS Profile', p.name):
            doc = frappe.new_doc('Standalone POS Profile')
            doc.name = p.name
            for f in FIELDS:
                doc.set(f, p.get(f))
            doc.insert(ignore_permissions=True)

frappe.ui.form.on("Standalone POS Profile", {
	setup: function (frm) {
		frm.set_query("posa_cash_mode_of_payment", function () {
			return { filters: { type: "Cash" } };
		});
		frappe.call({
			method: "posawesome.posawesome.api.utilities.get_language_options",
			callback: function (r) {
				if (!r.exc) {
					frm.fields_dict["posa_language"].df.options = r.message;
					frm.refresh_field("posa_language");
				}
			},
		});
	},
});

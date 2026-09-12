import SwiftUI

struct AddBillSheet: View {
    let payday: Date
    var existing: Bill? = nil
    var currencyCode: String = "PLN"
    let onSave: (Bill) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var amountText = ""
    @State private var dueDate = Date()
    @State private var category: ExpenseCategory? = .rent
    @State private var isRecurring = false

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: currencyCode)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    TextField("Name", text: $name)
                        .font(.system(.title3, design: .rounded).weight(.semibold))
                        .softField()

                    AmountTextField(title: "Amount", text: $amountText, suffix: currency.symbol)

                    DatePicker("Due date", selection: $dueDate, in: ...payday, displayedComponents: .date)
                        .tint(PayPaceTheme.accent)
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.white.opacity(0.78))
                        )

                    Text("Category (optional)")
                        .font(.system(.subheadline, design: .rounded).weight(.medium))
                        .foregroundStyle(PayPaceTheme.inkSecondary)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 10)], spacing: 10) {
                        ForEach(ExpenseCategory.mandatorySuggestions) { item in
                            Button {
                                category = item
                                if name.isEmpty { name = item.title }
                            } label: {
                                Text(item.title)
                                    .font(.system(.caption, design: .rounded).weight(.semibold))
                                    .foregroundStyle(category == item ? .white : PayPaceTheme.ink)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .fill(category == item ? PayPaceTheme.accent : Color.white.opacity(0.7))
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Toggle("Recurring each pay cycle", isOn: $isRecurring)
                        .font(.system(.body, design: .rounded))
                        .tint(PayPaceTheme.accent)
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.white.opacity(0.78))
                        )

                    Button("Save bill") {
                        guard let amount = DecimalParsing.parse(amountText), !name.isEmpty else { return }
                        let bill = Bill(
                            id: existing?.id ?? UUID(),
                            name: name,
                            amount: amount,
                            dueDate: dueDate,
                            category: category,
                            isRecurring: isRecurring,
                            isPaid: existing?.isPaid ?? false
                        )
                        onSave(bill)
                        dismiss()
                    }
                    .buttonStyle(PrimaryButtonStyle(isEnabled: canSave))
                    .disabled(!canSave)
                }
                .padding(20)
            }
            .background(PayPaceBackground())
            .navigationTitle(existing == nil ? "Add bill" : "Edit bill")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                if let existing {
                    name = existing.name
                    amountText = existing.amount.plainString
                    dueDate = existing.dueDate
                    category = existing.category
                    isRecurring = existing.isRecurring
                } else {
                    dueDate = min(Date(), payday)
                }
            }
        }
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && DecimalParsing.parse(amountText) != nil
    }
}

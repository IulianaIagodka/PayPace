import SwiftUI

struct AddExpenseView: View {
    @Bindable var budget: BudgetStore
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var amountText = ""
    @State private var category: ExpenseCategory?
    @State private var showConfirmation = false
    @State private var lastSafeToday: Decimal = 0

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    var body: some View {
        ZStack {
            PayPaceBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text("Add spending")
                        .font(.system(.largeTitle, design: .rounded).weight(.bold))
                        .foregroundStyle(PayPaceTheme.ink)

                    Text("Keep it simple. Name and amount are enough.")
                        .font(.system(.body, design: .rounded))
                        .foregroundStyle(PayPaceTheme.inkSecondary)

                    TextField("What did you spend on?", text: $name)
                        .font(.system(.title3, design: .rounded).weight(.semibold))
                        .softField()

                    AmountTextField(title: "Amount", text: $amountText, suffix: currency.symbol)

                    Text("Category (optional)")
                        .font(.system(.subheadline, design: .rounded).weight(.medium))
                        .foregroundStyle(PayPaceTheme.inkSecondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(ExpenseCategory.allCases) { item in
                                Button {
                                    category = category == item ? nil : item
                                    if name.isEmpty, category != nil {
                                        name = item.title
                                    }
                                } label: {
                                    Label(item.title, systemImage: item.systemImage)
                                        .font(.system(.caption, design: .rounded).weight(.semibold))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 10)
                                        .foregroundStyle(category == item ? .white : PayPaceTheme.ink)
                                        .background(
                                            Capsule()
                                                .fill(category == item ? PayPaceTheme.accent : Color.white.opacity(0.7))
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if showConfirmation {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Logged")
                                .font(.system(.subheadline, design: .rounded).weight(.medium))
                                .foregroundStyle(PayPaceTheme.inkSecondary)
                            Text("Safe today: \(currency.string(from: lastSafeToday))")
                                .font(.system(.title2, design: .rounded).weight(.bold))
                                .foregroundStyle(PayPaceTheme.accent)
                                .contentTransition(.numericText())
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(PayPaceTheme.accentSoft)
                        )
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    Button("Add expense") {
                        addExpense()
                    }
                    .buttonStyle(PrimaryButtonStyle(isEnabled: canSave))
                    .disabled(!canSave)

                    Button("Done") { dismiss() }
                        .buttonStyle(SecondaryButtonStyle())
                }
                .padding(24)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && DecimalParsing.parse(amountText) != nil
    }

    private func addExpense() {
        guard let amount = DecimalParsing.parse(amountText) else { return }
        let expense = DailyExpense(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            amount: amount,
            category: category
        )
        budget.addExpense(expense)
        lastSafeToday = max(budget.snapshot.safeToSpendToday, 0)
        withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) {
            showConfirmation = true
        }
        name = ""
        amountText = ""
        category = nil
    }
}

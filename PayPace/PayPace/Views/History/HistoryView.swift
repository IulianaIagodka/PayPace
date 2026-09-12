import SwiftUI

struct HistoryView: View {
    @Bindable var budget: BudgetStore

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    var body: some View {
        ZStack {
            PayPaceBackground()

            if !budget.settings.isPremium {
                VStack(spacing: 18) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(PayPaceTheme.accent)
                    Text("History is Premium")
                        .font(.system(.title2, design: .rounded).weight(.bold))
                        .foregroundStyle(PayPaceTheme.ink)
                    Text("Look back across finished pay cycles, spending patterns, and how your safe-to-spend held up.")
                        .font(.system(.body, design: .rounded))
                        .foregroundStyle(PayPaceTheme.inkSecondary)
                        .multilineTextAlignment(.center)
                    NavigationLink(value: AppRoute.settings) {
                        Text("See Premium")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .padding(28)
            } else if budget.pastCycles.isEmpty && budget.activeCycle?.expenses.isEmpty == true {
                ContentUnavailableView(
                    "No history yet",
                    systemImage: "clock",
                    description: Text("Completed pay cycles and daily spending will appear here.")
                )
            } else {
                List {
                    if let cycle = budget.activeCycle, !cycle.expenses.isEmpty {
                        Section("This cycle") {
                            ForEach(cycle.expenses) { expense in
                                ExpenseRowView(expense: expense, currency: currency)
                                    .listRowBackground(Color.white.opacity(0.55))
                            }
                        }
                    }

                    if !budget.pastCycles.isEmpty {
                        Section("Past pay cycles") {
                            ForEach(budget.pastCycles) { cycle in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("\(DateFormatting.medium(cycle.startDate)) → \(DateFormatting.medium(cycle.nextPayday))")
                                        .font(.system(.body, design: .rounded).weight(.semibold))
                                    Text("Spent \(currency.string(from: cycle.spentThisCycle)) · \(cycle.schedule.title)")
                                        .font(.system(.caption, design: .rounded))
                                        .foregroundStyle(PayPaceTheme.inkSecondary)
                                }
                                .listRowBackground(Color.white.opacity(0.55))
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("History")
    }
}

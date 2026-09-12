import SwiftUI

struct HomeView: View {
    @Bindable var budget: BudgetStore

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    var body: some View {
        NavigationStack(path: $budget.path) {
            ZStack {
                PayPaceBackground()

                if let cycle = budget.activeCycle {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 28) {
                            header

                            SafeSpendHero(
                                safeToday: budget.snapshot.safeToSpendToday,
                                remaining: budget.snapshot.remainingUntilPayday,
                                daysUntil: budget.snapshot.daysUntilPayday,
                                currency: currency,
                                isAtRisk: budget.snapshot.isAtRisk
                            )
                            .padding(.top, 8)

                            CycleProgressBar(
                                progress: budget.snapshot.cycleProgress,
                                daysElapsed: cycle.daysElapsed,
                                totalDays: cycle.totalDaysInCycle
                            )

                            if let shortfall = budget.snapshot.projectedShortfallDays {
                                paceWarning(shortfall)
                            }

                            upcomingSection(cycle)
                            recentSpending(cycle)

                            Button {
                                budget.path.append(.addExpense)
                            } label: {
                                Label("Add spending", systemImage: "plus")
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .padding(.top, 4)
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 36)
                        .padding(.top, 8)
                    }
                } else {
                    ContentUnavailableView(
                        "No pay cycle",
                        systemImage: "calendar",
                        description: Text("Create a pay cycle to see what you can safely spend.")
                    )
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        budget.path.append(.payCycleDetails)
                    } label: {
                        Image(systemName: "calendar.badge.clock")
                            .foregroundStyle(PayPaceTheme.ink)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        budget.path.append(.settings)
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(PayPaceTheme.ink)
                    }
                }
            }
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .addExpense:
                    AddExpenseView(budget: budget)
                case .upcomingBills:
                    UpcomingBillsView(budget: budget)
                case .payCycleDetails:
                    PayCycleDetailsView(budget: budget)
                case .history:
                    HistoryView(budget: budget)
                case .settings:
                    SettingsView(budget: budget)
                case .addBill:
                    AddBillEmbeddedView(budget: budget)
                case .editBill(let bill):
                    EditBillEmbeddedView(budget: budget, bill: bill)
                }
            }
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("PayPace")
                .font(.system(.title2, design: .rounded).weight(.bold))
                .foregroundStyle(PayPaceTheme.ink)
            Spacer()
            if let cycle = budget.activeCycle {
                Text("Payday \(DateFormatting.medium(cycle.nextPayday))")
                    .font(.system(.caption, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
        }
    }

    private func paceWarning(_ days: Int) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(PayPaceTheme.warmHighlight)
            Text("At your current pace, you may run short \(days) days before payday.")
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(PayPaceTheme.ink)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(PayPaceTheme.warmHighlight.opacity(0.15))
        )
    }

    private func upcomingSection(_ cycle: PayCycle) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Upcoming expenses", actionTitle: "See all") {
                budget.path.append(.upcomingBills)
            }

            let bills = Array(cycle.upcomingBills.prefix(3))
            if bills.isEmpty {
                EmptyStateHint(
                    title: "No upcoming bills",
                    subtitle: "Add rent, utilities, or subscriptions due before payday."
                )
            } else {
                VStack(spacing: 12) {
                    ForEach(bills) { bill in
                        BillRowView(bill: bill, currency: currency)
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white.opacity(0.62))
                )
            }
        }
    }

    private func recentSpending(_ cycle: PayCycle) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Daily spending", actionTitle: "Add") {
                budget.path.append(.addExpense)
            }

            let expenses = Array(cycle.expenses.prefix(4))
            if expenses.isEmpty {
                EmptyStateHint(
                    title: "Nothing logged yet",
                    subtitle: "Quickly add coffee, lunch, or anything else — categories are optional."
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(expenses) { expense in
                        ExpenseRowView(expense: expense, currency: currency)
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white.opacity(0.62))
                )
            }
        }
    }
}

private struct AddBillEmbeddedView: View {
    @Bindable var budget: BudgetStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        AddBillSheet(payday: budget.activeCycle?.nextPayday ?? .now, currencyCode: budget.settings.currencyCode) { bill in
            budget.addBill(bill)
            dismiss()
        }
    }
}

private struct EditBillEmbeddedView: View {
    @Bindable var budget: BudgetStore
    let bill: Bill
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        AddBillSheet(payday: budget.activeCycle?.nextPayday ?? .now, existing: bill, currencyCode: budget.settings.currencyCode) { updated in
            budget.updateBill(updated)
            dismiss()
        }
    }
}

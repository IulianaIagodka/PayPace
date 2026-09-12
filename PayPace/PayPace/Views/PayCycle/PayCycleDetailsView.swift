import SwiftUI

struct PayCycleDetailsView: View {
    @Bindable var budget: BudgetStore
    @State private var balanceText = ""
    @State private var paycheckText = ""
    @State private var savingsText = ""
    @State private var emergencyText = ""
    @State private var bufferText = ""
    @State private var nextPayday = Date()
    @State private var schedule: PaySchedule = .monthly
    @State private var showSaved = false

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    var body: some View {
        ZStack {
            PayPaceBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let cycle = budget.activeCycle {
                        Text("This pay cycle")
                            .font(.system(.largeTitle, design: .rounded).weight(.bold))
                            .foregroundStyle(PayPaceTheme.ink)

                        Text("From \(DateFormatting.medium(cycle.startDate)) to \(DateFormatting.medium(cycle.nextPayday))")
                            .font(.system(.body, design: .rounded))
                            .foregroundStyle(PayPaceTheme.inkSecondary)

                        CycleProgressBar(
                            progress: budget.snapshot.cycleProgress,
                            daysElapsed: cycle.daysElapsed,
                            totalDays: cycle.totalDaysInCycle
                        )

                        summaryChips(cycle)

                        AmountTextField(title: "Current balance", text: $balanceText, suffix: currency.symbol)
                        AmountTextField(title: "Expected paycheck", text: $paycheckText, suffix: currency.symbol)

                        DatePicker("Next payday", selection: $nextPayday, in: Date()..., displayedComponents: .date)
                            .tint(PayPaceTheme.accent)
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Color.white.opacity(0.78))
                            )

                        schedulePicker

                        AmountTextField(title: "Savings", text: $savingsText, suffix: currency.symbol)
                        AmountTextField(title: "Emergency buffer", text: $emergencyText, suffix: currency.symbol)
                        AmountTextField(title: "Spending buffer", text: $bufferText, suffix: currency.symbol)

                        Button("Save changes") {
                            save()
                        }
                        .buttonStyle(PrimaryButtonStyle())

                        Button("Start next pay cycle") {
                            startNextCycle(from: cycle)
                        }
                        .buttonStyle(SecondaryButtonStyle())

                        if showSaved {
                            Text("Updated — your safe-to-spend number refreshed.")
                                .font(.system(.subheadline, design: .rounded))
                                .foregroundStyle(PayPaceTheme.success)
                                .transition(.opacity)
                        }

                        NavigationLink(value: AppRoute.history) {
                            Text("View history")
                                .font(.system(.body, design: .rounded).weight(.semibold))
                                .foregroundStyle(PayPaceTheme.accent)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                    }
                }
                .padding(24)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear(perform: load)
    }

    private func summaryChips(_ cycle: PayCycle) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            chip("Safe today", currency.string(from: max(budget.snapshot.safeToSpendToday, 0)))
            chip("Left until payday", currency.string(from: budget.snapshot.remainingUntilPayday))
            chip("Bills reserved", currency.string(from: cycle.unpaidBillsTotal))
            chip("Spent this cycle", currency.string(from: cycle.spentThisCycle))
        }
    }

    private func chip(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(PayPaceTheme.inkSecondary)
            Spacer()
            Text(value)
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundStyle(PayPaceTheme.ink)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.62))
        )
    }

    private var schedulePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Salary schedule")
                .font(.system(.subheadline, design: .rounded).weight(.medium))
                .foregroundStyle(PayPaceTheme.inkSecondary)

            ForEach(PaySchedule.allCases) { item in
                Button {
                    schedule = item
                } label: {
                    HStack {
                        Text(item.title)
                            .font(.system(.body, design: .rounded).weight(.medium))
                            .foregroundStyle(PayPaceTheme.ink)
                        Spacer()
                        Image(systemName: schedule == item ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(schedule == item ? PayPaceTheme.accent : PayPaceTheme.inkSecondary)
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.white.opacity(0.7))
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func load() {
        guard let cycle = budget.activeCycle else { return }
        balanceText = cycle.currentBalance.plainString
        paycheckText = cycle.expectedPaycheck == 0 ? "" : cycle.expectedPaycheck.plainString
        savingsText = cycle.savingsGoal == 0 ? "" : cycle.savingsGoal.plainString
        emergencyText = cycle.emergencyBuffer == 0 ? "" : cycle.emergencyBuffer.plainString
        bufferText = cycle.spendingBuffer == 0 ? "" : cycle.spendingBuffer.plainString
        nextPayday = cycle.nextPayday
        schedule = cycle.schedule
    }

    private func save() {
        budget.updateActiveCycle { cycle in
            cycle.currentBalance = DecimalParsing.parseOrZero(balanceText)
            cycle.expectedPaycheck = DecimalParsing.parseOrZero(paycheckText)
            cycle.savingsGoal = DecimalParsing.parseOrZero(savingsText)
            cycle.emergencyBuffer = DecimalParsing.parseOrZero(emergencyText)
            cycle.spendingBuffer = DecimalParsing.parseOrZero(bufferText)
            cycle.nextPayday = nextPayday
            cycle.schedule = schedule
        }
        withAnimation {
            showSaved = true
        }
    }

    private func startNextCycle(from cycle: PayCycle) {
        let payday = schedule.nextPayday(after: nextPayday)
        let recurring = cycle.bills.filter(\.isRecurring).map { bill -> Bill in
            var copy = bill
            copy.id = UUID()
            copy.isPaid = false
            copy.dueDate = min(copy.dueDate, payday)
            return copy
        }

        let fresh = PayCycle(
            schedule: schedule,
            startDate: nextPayday,
            nextPayday: payday,
            currentBalance: DecimalParsing.parseOrZero(balanceText) + DecimalParsing.parseOrZero(paycheckText),
            expectedPaycheck: DecimalParsing.parseOrZero(paycheckText),
            savingsGoal: DecimalParsing.parseOrZero(savingsText),
            emergencyBuffer: DecimalParsing.parseOrZero(emergencyText),
            spendingBuffer: DecimalParsing.parseOrZero(bufferText),
            bills: budget.settings.isPremium ? recurring : [],
            expenses: [],
            isActive: true
        )

        if budget.settings.isPremium {
            budget.archiveActiveAndStart(fresh)
        } else {
            budget.replaceActiveCycle(with: fresh)
        }
        load()
        showSaved = true
    }
}

import SwiftUI

struct OnboardingFlowView: View {
    @Bindable var budget: BudgetStore
    @State private var step: Step = .welcome
    @State private var balanceText = ""
    @State private var nextPayday = Calendar.current.date(byAdding: .day, value: 15, to: .now) ?? .now
    @State private var paycheckText = ""
    @State private var schedule: PaySchedule = .monthly
    @State private var savingsText = ""
    @State private var emergencyText = ""
    @State private var bufferText = ""
    @State private var bills: [Bill] = []
    @State private var showAddBill = false
    @State private var revealResult = false

    enum Step: Int {
        case welcome
        case balance
        case payday
        case bills
        case result
    }

    private var currency: CurrencyFormatter {
        CurrencyFormatter(code: budget.settings.currencyCode)
    }

    private var moneySuffix: String { currency.symbol }

    var body: some View {
        ZStack {
            PayPaceBackground()

            switch step {
            case .welcome:
                WelcomeView { advance(to: .balance) }
            case .balance:
                onboardingScaffold(
                    title: "How much money do you have right now?",
                    subtitle: "Your available balance — cash and accounts you can actually use."
                ) {
                    AmountTextField(title: "Available balance", text: $balanceText, suffix: moneySuffix)
                    Spacer()
                    Button("Continue") { advance(to: .payday) }
                        .buttonStyle(PrimaryButtonStyle(isEnabled: DecimalParsing.parse(balanceText) != nil))
                        .disabled(DecimalParsing.parse(balanceText) == nil)
                }
            case .payday:
                onboardingScaffold(
                    title: "When is your next payday?",
                    subtitle: "PayPace budgets from now until that day — not by calendar month."
                ) {
                    VStack(alignment: .leading, spacing: 16) {
                        DatePicker(
                            "Next payday",
                            selection: $nextPayday,
                            in: Date()...,
                            displayedComponents: .date
                        )
                        .datePickerStyle(.graphical)
                        .tint(PayPaceTheme.accent)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.white.opacity(0.75))
                        )

                        AmountTextField(title: "Expected paycheck (optional)", text: $paycheckText, suffix: moneySuffix)

                        Text("Pay schedule")
                            .font(.system(.subheadline, design: .rounded).weight(.medium))
                            .foregroundStyle(PayPaceTheme.inkSecondary)

                        ForEach(PaySchedule.allCases) { item in
                            Button {
                                schedule = item
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.title)
                                            .font(.system(.body, design: .rounded).weight(.semibold))
                                            .foregroundStyle(PayPaceTheme.ink)
                                        Text(item.subtitle)
                                            .font(.system(.caption, design: .rounded))
                                            .foregroundStyle(PayPaceTheme.inkSecondary)
                                    }
                                    Spacer()
                                    Image(systemName: schedule == item ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(schedule == item ? PayPaceTheme.accent : PayPaceTheme.inkSecondary)
                                }
                                .padding(14)
                                .background(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .fill(Color.white.opacity(schedule == item ? 0.9 : 0.55))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Spacer(minLength: 16)
                    Button("Continue") { advance(to: .bills) }
                        .buttonStyle(PrimaryButtonStyle())
                }
            case .bills:
                onboardingScaffold(
                    title: "What needs to be paid before then?",
                    subtitle: "Add rent, bills, and anything that must be covered before payday."
                ) {
                    if bills.isEmpty {
                        EmptyStateHint(
                            title: "No bills yet",
                            subtitle: "You can skip this and add them later — but including them makes your safe-to-spend number trustworthy."
                        )
                    } else {
                        VStack(spacing: 8) {
                            ForEach(bills) { bill in
                                BillRowView(bill: bill, currency: currency)
                            }
                        }
                    }

                    Button {
                        showAddBill = true
                    } label: {
                        Label("Add a bill", systemImage: "plus")
                    }
                    .buttonStyle(SecondaryButtonStyle())

                    VStack(spacing: 14) {
                        AmountTextField(title: "Amount to save (optional)", text: $savingsText, suffix: moneySuffix)
                        AmountTextField(title: "Emergency buffer (optional)", text: $emergencyText, suffix: moneySuffix)
                        AmountTextField(title: "Spending buffer (optional)", text: $bufferText, suffix: moneySuffix)
                    }
                    .padding(.top, 8)

                    Spacer(minLength: 16)

                    Button(bills.isEmpty ? "See my safe spend" : "Calculate safe spend") {
                        finishOnboarding()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .sheet(isPresented: $showAddBill) {
                    AddBillSheet(payday: nextPayday, currencyCode: budget.settings.currencyCode) { bill in
                        bills.append(bill)
                    }
                }
            case .result:
                resultView
            }
        }
    }

    @ViewBuilder
    private func onboardingScaffold<Content: View>(
        title: String,
        subtitle: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                progressDots
                Text(title)
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                    .foregroundStyle(PayPaceTheme.ink)
                Text(subtitle)
                    .font(.system(.body, design: .rounded))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
                content()
            }
            .padding(24)
        }
    }

    private var progressDots: some View {
        HStack(spacing: 8) {
            ForEach([Step.balance, .payday, .bills], id: \.rawValue) { item in
                Capsule()
                    .fill(item.rawValue <= step.rawValue ? PayPaceTheme.accent : PayPaceTheme.ink.opacity(0.12))
                    .frame(width: item == step ? 28 : 10, height: 8)
                    .animation(.easeOut(duration: 0.25), value: step)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var resultView: some View {
        let cycle = makeCycle()
        let snap = SafeSpendCalculator.snapshot(for: cycle)

        return VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Text("You’re set")
                .font(.system(.title3, design: .rounded).weight(.medium))
                .foregroundStyle(PayPaceTheme.inkSecondary)
                .opacity(revealResult ? 1 : 0)

            SafeSpendHero(
                safeToday: snap.safeToSpendToday,
                remaining: snap.remainingUntilPayday,
                daysUntil: snap.daysUntilPayday,
                currency: currency,
                isAtRisk: snap.isAtRisk
            )
            .opacity(revealResult ? 1 : 0)

            CycleProgressBar(
                progress: snap.cycleProgress,
                daysElapsed: cycle.daysElapsed,
                totalDays: cycle.totalDaysInCycle
            )
            .opacity(revealResult ? 1 : 0)

            Spacer()

            Button("Go to home") {
                budget.completeOnboarding(with: cycle)
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding(28)
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.85).delay(0.1)) {
                revealResult = true
            }
        }
    }

    private func advance(to next: Step) {
        withAnimation(.easeInOut(duration: 0.28)) {
            step = next
        }
    }

    private func finishOnboarding() {
        advance(to: .result)
    }

    private func makeCycle() -> PayCycle {
        PayCycle(
            schedule: schedule,
            startDate: .now,
            nextPayday: nextPayday,
            currentBalance: DecimalParsing.parseOrZero(balanceText),
            expectedPaycheck: DecimalParsing.parseOrZero(paycheckText),
            savingsGoal: DecimalParsing.parseOrZero(savingsText),
            emergencyBuffer: DecimalParsing.parseOrZero(emergencyText),
            spendingBuffer: DecimalParsing.parseOrZero(bufferText),
            bills: bills,
            expenses: [],
            isActive: true
        )
    }
}

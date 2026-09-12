import SwiftUI

struct CycleProgressBar: View {
    let progress: Double
    let daysElapsed: Int
    let totalDays: Int

    @State private var animatedProgress: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(PayPaceTheme.ink.opacity(0.08))
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [PayPaceTheme.accent, PayPaceTheme.accent.opacity(0.75)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: max(8, geo.size.width * animatedProgress))
                }
            }
            .frame(height: 10)

            HStack {
                Text("Pay cycle")
                    .font(.system(.caption, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
                Spacer()
                Text("\(min(daysElapsed, totalDays)) of \(totalDays) days")
                    .font(.system(.caption, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animatedProgress = min(max(progress, 0), 1)
            }
        }
        .onChange(of: progress) { _, newValue in
            withAnimation(.easeOut(duration: 0.45)) {
                animatedProgress = min(max(newValue, 0), 1)
            }
        }
    }
}

struct SafeSpendHero: View {
    let safeToday: Decimal
    let remaining: Decimal
    let daysUntil: Int
    let currency: CurrencyFormatter
    let isAtRisk: Bool

    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("You can safely spend")
                .font(.system(.title3, design: .rounded).weight(.medium))
                .foregroundStyle(PayPaceTheme.inkSecondary)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(currency.string(from: max(safeToday, 0)))
                    .font(.system(size: 52, weight: .bold, design: .rounded))
                    .foregroundStyle(isAtRisk ? PayPaceTheme.danger : PayPaceTheme.ink)
                    .contentTransition(.numericText())
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Text("today")
                    .font(.system(.title2, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
            .scaleEffect(appeared ? 1 : 0.96)
            .opacity(appeared ? 1 : 0)

            VStack(alignment: .leading, spacing: 6) {
                Text("\(currency.string(from: remaining)) left until payday")
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .foregroundStyle(PayPaceTheme.ink)
                Text(daysLabel)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
                appeared = true
            }
        }
    }

    private var daysLabel: String {
        if daysUntil == 0 { return "Payday is today" }
        if daysUntil == 1 { return "1 day until payday" }
        return "\(daysUntil) days until payday"
    }
}

struct EmptyStateHint: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(.headline, design: .rounded))
                .foregroundStyle(PayPaceTheme.ink)
            Text(subtitle)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(PayPaceTheme.inkSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.55))
        )
    }
}

struct BillRowView: View {
    let bill: Bill
    let currency: CurrencyFormatter

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: bill.category?.systemImage ?? "calendar")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(PayPaceTheme.accent)
                .frame(width: 36, height: 36)
                .background(Circle().fill(PayPaceTheme.accentSoft))

            VStack(alignment: .leading, spacing: 2) {
                Text(bill.name)
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .foregroundStyle(PayPaceTheme.ink)
                Text(DateFormatting.medium(bill.dueDate))
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }

            Spacer()

            Text(currency.string(from: bill.amount))
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundStyle(PayPaceTheme.ink)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

struct ExpenseRowView: View {
    let expense: DailyExpense
    let currency: CurrencyFormatter

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(expense.name)
                    .font(.system(.body, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.ink)
                Text(DateFormatting.relativeDay(expense.date))
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
            Spacer()
            Text(currency.string(from: expense.amount))
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundStyle(PayPaceTheme.ink)
        }
        .padding(.vertical, 6)
    }
}

struct AmountTextField: View {
    let title: String
    @Binding var text: String
    var suffix: String = "zł"

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(.subheadline, design: .rounded).weight(.medium))
                .foregroundStyle(PayPaceTheme.inkSecondary)
            HStack {
                TextField("0", text: $text)
                    .keyboardType(.decimalPad)
                    .font(.system(.title2, design: .rounded).weight(.semibold))
                    .foregroundStyle(PayPaceTheme.ink)
                Text(suffix)
                    .font(.system(.title3, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
            }
            .softField()
        }
    }
}

struct SectionHeader: View {
    let title: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack {
            Text(title)
                .font(.system(.headline, design: .rounded).weight(.semibold))
                .foregroundStyle(PayPaceTheme.ink)
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundStyle(PayPaceTheme.accent)
            }
        }
    }
}

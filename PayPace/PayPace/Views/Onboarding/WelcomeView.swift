import SwiftUI

struct WelcomeView: View {
    let onContinue: () -> Void

    @State private var showContent = false

    var body: some View {
        ZStack {
            PayPaceBackground()

            VStack(alignment: .leading, spacing: 0) {
                Spacer()

                Text("PayPace")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(PayPaceTheme.ink)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 12)

                Text("Know what you can spend.\nUntil your next payday.")
                    .font(.system(.title2, design: .rounded).weight(.medium))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
                    .padding(.top, 18)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 16)

                Text("No monthly spreadsheet. Just a clear number for today — and peace of mind until payday.")
                    .font(.system(.body, design: .rounded))
                    .foregroundStyle(PayPaceTheme.inkSecondary)
                    .padding(.top, 20)
                    .opacity(showContent ? 1 : 0)

                Spacer()

                Button("Get started", action: onContinue)
                    .buttonStyle(PrimaryButtonStyle())
                    .opacity(showContent ? 1 : 0)
            }
            .padding(.horizontal, 28)
            .padding(.bottom, 24)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) {
                showContent = true
            }
        }
    }
}

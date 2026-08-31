import SwiftUI

struct AnswerInputView: View {
    @Binding var answer: String
    @FocusState.Binding var isFocused: Bool
    let enabled: Bool
    let submit: () -> Void

    var body: some View {
        HStack {
            TextField(enabled ? "輸入完整答案" : "先點選字格或線索", text: $answer)
                .focused($isFocused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .onSubmit(submit)
                .disabled(!enabled)
                .padding(12)
                .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
            Button("送出", action: submit)
                .buttonStyle(.borderedProminent)
                .disabled(!enabled || answer.isEmpty)
        }
        .accessibilityIdentifier("cross-answer")
        .onChange(of: enabled) { canAnswer in
            if canAnswer {
                isFocused = true
            } else {
                isFocused = false
            }
        }
    }
}

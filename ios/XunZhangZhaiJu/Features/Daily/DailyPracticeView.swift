import SwiftUI

struct DailyPracticeView: View {
    @EnvironmentObject private var container: AppContainer
    @State private var index = 0
    @State private var answer = ""
    @State private var score = 0
    @State private var feedback = ""
    let questions: [LearningQuestion]

    init(phrases: [Phrase], phraseIDs: [String]) {
        questions = LearningQuizEngine().buildQuestions(
            phrases: phrases,
            targetPhraseIDs: phraseIDs,
            count: 5,
            randomValues: Array(repeating: 0.37, count: 40)
        )
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            VStack(spacing: 18) {
                if index < questions.count {
                    let question = questions[index]
                    Text("第 \(index + 1) / \(questions.count) 題")
                        .foregroundStyle(AppTheme.accent)
                    Text(question.prompt)
                        .font(.title2.bold())
                        .multilineTextAlignment(.center)
                    if question.kind == .choice {
                        ForEach(question.options, id: \.self) { option in
                            Button(option) { submit(option, question: question) }
                                .buttonStyle(.bordered)
                                .frame(maxWidth: .infinity)
                        }
                    } else {
                        TextField("輸入缺少的字", text: $answer)
                            .multilineTextAlignment(.center)
                            .padding()
                            .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                        Button("送出") { submit(answer, question: question) }
                            .buttonStyle(.borderedProminent)
                    }
                    Text(feedback).foregroundStyle(AppTheme.secondaryText)
                } else {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(AppTheme.accent)
                    Text("快陣完成")
                        .font(.largeTitle.bold())
                    Text("答對 \(score) / \(questions.count) 題")
                }
            }
            .foregroundStyle(AppTheme.primaryText)
            .padding()
        }
        .navigationTitle("一炷香快陣")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit(_ value: String, question: LearningQuestion) {
        let correct = value.trimmingCharacters(in: .whitespacesAndNewlines) == question.answer
        if correct { score += 1 }
        try? container.recordQuiz(
            phraseID: question.phraseID,
            kind: question.kind,
            correct: correct
        )
        feedback = correct ? "答對了，墨香入硯。" : "答案是「\(question.answer)」。"
        answer = ""
        index += 1
    }
}

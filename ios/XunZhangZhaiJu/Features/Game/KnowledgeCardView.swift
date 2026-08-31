import SwiftUI

struct KnowledgeCardView: View {
    @EnvironmentObject private var container: AppContainer
    @State private var practiceText = ""
    @State private var saveMessage = ""
    let phrase: Phrase

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(phrase.text)
                    .font(.largeTitle.bold())
                    .foregroundStyle(AppTheme.accent)
                Text("\(phrase.type.rawValue)・\(phrase.level.rawValue)")
                    .font(.headline)
                if let dynasty = phrase.dynasty, let author = phrase.author {
                    Text("\(dynasty)・\(author)")
                }
                Text("白話釋義").font(.headline)
                Text(phrase.meaning)
                Text("延伸體會").font(.headline)
                Text(phrase.insight)
                Divider().overlay(Color.white.opacity(0.25))
                Text("我的使用情境").font(.headline)
                TextEditor(text: $practiceText)
                    .frame(minHeight: 90)
                    .padding(8)
                    .scrollContentBackground(.hidden)
                    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                    .onChange(of: practiceText) { value in
                        if value.count > 80 { practiceText = String(value.prefix(80)) }
                    }
                HStack {
                    Text("\(practiceText.count) / 80・只存這台裝置")
                        .font(.caption)
                        .foregroundStyle(AppTheme.secondaryText)
                    Spacer()
                    Button("儲存") {
                        do {
                            try container.savePractice(phraseID: phrase.id, text: practiceText)
                            saveMessage = "已存下這次體會。"
                        } catch {
                            saveMessage = error.localizedDescription
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                }
                if !saveMessage.isEmpty {
                    Text(saveMessage)
                        .font(.caption)
                        .foregroundStyle(AppTheme.secondaryText)
                }
            }
            .foregroundStyle(AppTheme.primaryText)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .background(AppTheme.background)
        .onAppear {
            practiceText = container.practices[phrase.id]?.text ?? ""
        }
    }
}

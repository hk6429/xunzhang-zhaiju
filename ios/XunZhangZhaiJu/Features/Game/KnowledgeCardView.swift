import SwiftUI

struct KnowledgeCardView: View {
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
            }
            .foregroundStyle(AppTheme.primaryText)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .background(AppTheme.background)
    }
}

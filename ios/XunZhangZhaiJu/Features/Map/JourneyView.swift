import SwiftUI

struct JourneyView: View {
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        Group {
            switch container.startupState {
            case .ready:
                if let content = container.content {
                    ScrollView {
                        VStack(spacing: 28) {
                            mapHeader
                            ForEach(1...10, id: \.self) { chapter in
                                VStack(alignment: .leading, spacing: 12) {
                                    chapterHeader(chapter, content: content)
                                    LazyVGrid(
                                        columns: [GridItem(.adaptive(minimum: 150), spacing: 14)],
                                        spacing: 14
                                    ) {
                                        ForEach(content.levels.filter { $0.chapter == chapter }) { level in
                                            levelLink(level, content: content)
                                        }
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                    .background(AppTheme.background)
                }
            case let .failed(message):
                VStack(spacing: 14) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(Color.orange)
                    Text("內容無法載入")
                        .font(.title2.bold())
                    Text(message)
                        .multilineTextAlignment(.center)
                }
                .foregroundStyle(AppTheme.primaryText)
                .padding()
            }
        }
        .navigationTitle("修煉山河")
    }

    private var mapHeader: some View {
        Image("JourneyMap")
            .resizable()
            .scaledToFill()
            .frame(maxWidth: .infinity)
            .aspectRatio(2, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading) {
                    Text("封神山河卷・文林淬鍊卷")
                        .font(.title2.bold())
                    Text("100 座字陣，尋回人間真言")
                }
                .foregroundStyle(Color.white)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.black.opacity(0.72))
            }
    }

    @ViewBuilder
    private func chapterHeader(_ chapter: Int, content: AppContent) -> some View {
        let story = content.story.chapters.first { $0.id == chapter }
        VStack(alignment: .leading, spacing: 4) {
            Text(chapter <= 5 ? "山河卷・第 \(chapter) 章" : "文林卷・第 \(chapter) 章")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.accent)
            Text(story?.title ?? "第 \(chapter) 章")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.primaryText)
            if let region = story?.mapRegion {
                Text(region)
                    .foregroundStyle(AppTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private func levelLink(_ level: Level, content: AppContent) -> some View {
        let unlocked = level.requirements.completedAll.allSatisfy {
            (container.progress.levels[String($0)]?.stars ?? 0) > 0
        }
        let stars = container.progress.levels[String(level.id)]?.stars ?? 0
        NavigationLink {
            GameView(
                level: level,
                phrases: content.phrases,
                container: container,
                event: level.eventId.flatMap { eventID in
                    content.events.events.first { $0.id == eventID }
                }
            )
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("第 \(level.id) 關")
                        .font(.headline)
                    Spacer()
                    Image(systemName: unlocked ? "seal.fill" : "lock.fill")
                }
                Text(level.chapterTitle)
                    .font(.title3.bold())
                Text(level.layout == .full ? "尋句字陣" : "交叉填字")
                    .font(.subheadline)
                Text(stars > 0 ? String(repeating: "★", count: stars) + String(repeating: "☆", count: 3 - stars) : "尚未破陣")
                    .foregroundStyle(AppTheme.accent)
            }
            .foregroundStyle(AppTheme.primaryText)
            .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
            .padding()
            .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
            .overlay {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(unlocked ? AppTheme.accent.opacity(0.7) : Color.white.opacity(0.25))
            }
        }
        .disabled(!unlocked)
        .opacity(unlocked ? 1 : 0.62)
        .accessibilityIdentifier("level-\(level.id)")
        .accessibilityLabel("第 \(level.id) 關，\(level.chapterTitle)，\(stars) 星")
    }
}

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var container: AppContainer
    @AppStorage("play-mode") private var playMode = PlayMode.standard.rawValue
    @State private var restMessage = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                rankCard
                statsGrid
                modeCard
                if (container.progress.activity?.levelsSinceRest ?? 0) >= 3 {
                    restCard
                }
                syncCard
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationTitle("我的")
    }

    private var rankCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "rosette")
                .font(.system(size: 46))
                .foregroundStyle(AppTheme.accent)
            Text(rank.title)
                .font(.largeTitle.bold())
            Text("修為 \(cultivationScore)")
                .foregroundStyle(AppTheme.secondaryText)
            ProgressView(value: Double(cultivationScore), total: Double(max(rank.nextNeed, 1)))
                .tint(AppTheme.accent)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var statsGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                stat("已破字陣", value: completedLevels, symbol: "seal")
                stat("累積星數", value: totalStars, symbol: "star.fill")
                stat("摘句收藏", value: container.progress.collection.count, symbol: "books.vertical")
            }
            HStack(spacing: 12) {
                stat("精熟句子", value: masteredCount, symbol: "checkmark.seal")
                stat("獲得星章", value: badgeCount, symbol: "medal")
                stat("連續修煉", value: container.progress.streak?.current ?? 0, symbol: "flame.fill")
            }
        }
    }

    private var modeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("遊玩模式").font(.headline)
            Picker("遊玩模式", selection: $playMode) {
                ForEach(PlayMode.allCases, id: \.rawValue) { mode in
                    Text(mode.label).tag(mode.rawValue)
                }
            }
            .pickerStyle(.segmented)
            Text("悟道時間較寬裕；標準維持原規則；天劫時間更緊、提示更少。")
                .font(.footnote)
                .foregroundStyle(AppTheme.secondaryText)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var syncCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("訪客模式・完整離線可玩", systemImage: "iphone.and.arrow.forward")
                .font(.headline)
            Text("Apple／Google 登入與 Turso 跨裝置同步將在同步階段啟用；本機進度已由 SQLite 保存。")
                .foregroundStyle(AppTheme.secondaryText)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var restCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("已連破三陣，讓眼睛歇一歇", systemImage: "cup.and.saucer.fill")
                .font(.headline)
            Text("看看遠方、喝口水，再回來找字會更俐落。")
                .foregroundStyle(AppTheme.secondaryText)
            Button("我歇過了") {
                do {
                    try container.takeRest()
                    restMessage = "精神回滿，再出發。"
                } catch {
                    restMessage = error.localizedDescription
                }
            }
            .buttonStyle(.bordered)
            if !restMessage.isEmpty { Text(restMessage).font(.caption) }
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private func stat(_ title: String, value: Int, symbol: String) -> some View {
        VStack(spacing: 7) {
            Image(systemName: symbol).foregroundStyle(AppTheme.accent)
            Text(String(value)).font(.title2.bold())
            Text(title).font(.caption)
        }
        .foregroundStyle(AppTheme.primaryText)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
    }

    private var completedLevels: Int {
        container.progress.levels.values.filter { $0.stars > 0 }.count
    }

    private var totalStars: Int {
        container.progress.levels.values.reduce(0) { $0 + min(3, $1.stars) }
    }

    private var cultivationScore: Int {
        totalStars + container.progress.collection.count / 10 + badgeCount + masteredCount / 5
    }

    private var masteredCount: Int {
        (container.progress.mastery ?? [:]).values.filter(\.mastered).count
    }

    private var badgeCount: Int {
        (container.progress.levelStats ?? [:]).values.reduce(0) { $0 + Set($1.badges).count }
    }

    private var rank: (title: String, nextNeed: Int) {
        let ranks = [(0, "白丁"), (6, "童生"), (20, "秀才"), (45, "舉人"), (75, "貢士"),
                     (110, "進士"), (140, "狀元"), (190, "翰林"), (250, "大學士"), (320, "文宗"), (420, "文曲星君")]
        let current = ranks.last { cultivationScore >= $0.0 } ?? ranks[0]
        let next = ranks.first { $0.0 > cultivationScore }?.0 ?? current.0
        return (current.1, next)
    }
}

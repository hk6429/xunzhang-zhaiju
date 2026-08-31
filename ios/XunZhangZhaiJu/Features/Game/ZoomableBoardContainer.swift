import SwiftUI

struct ZoomableBoardContainer<Content: View>: View {
    @ViewBuilder let content: Content
    @State private var scale: CGFloat = 1
    @State private var gestureScale: CGFloat = 1

    var body: some View {
        content
            .scaleEffect(scale * gestureScale)
            .gesture(
                MagnificationGesture()
                    .onChanged { gestureScale = $0 }
                    .onEnded {
                        scale = min(3, max(1, scale * $0))
                        gestureScale = 1
                    }
            )
            .clipped()
            .accessibilityAction(named: "放大盤面") { scale = min(3, scale + 0.5) }
            .accessibilityAction(named: "縮小盤面") { scale = max(1, scale - 0.5) }
    }
}

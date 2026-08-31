import SwiftUI
import UIKit

struct ZoomableBoardContainer<Content: View>: View {
    @ViewBuilder let content: Content
    @State private var scale: CGFloat = 1

    var body: some View {
        TwoFingerZoomScrollView(content: content, scale: $scale)
            .clipped()
            .accessibilityAction(named: "放大盤面") { scale = min(3, scale + 0.5) }
            .accessibilityAction(named: "縮小盤面") { scale = max(1, scale - 0.5) }
    }
}

private struct TwoFingerZoomScrollView<Content: View>: UIViewRepresentable {
    let content: Content
    @Binding var scale: CGFloat

    func makeCoordinator() -> Coordinator {
        Coordinator(content: content, scale: $scale)
    }

    func makeUIView(context: Context) -> UIScrollView {
        let scrollView = UIScrollView()
        scrollView.delegate = context.coordinator
        scrollView.minimumZoomScale = 1
        scrollView.maximumZoomScale = 3
        scrollView.bouncesZoom = true
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.panGestureRecognizer.minimumNumberOfTouches = 2
        scrollView.panGestureRecognizer.maximumNumberOfTouches = 2

        let hostedView = context.coordinator.hostingController.view!
        hostedView.backgroundColor = .clear
        hostedView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(hostedView)
        NSLayoutConstraint.activate([
            hostedView.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            hostedView.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            hostedView.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            hostedView.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            hostedView.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
            hostedView.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor),
        ])
        return scrollView
    }

    func updateUIView(_ scrollView: UIScrollView, context: Context) {
        context.coordinator.hostingController.rootView = content
        if abs(scrollView.zoomScale - scale) > 0.01 {
            scrollView.setZoomScale(scale, animated: true)
        }
    }

    @MainActor
    final class Coordinator: NSObject, UIScrollViewDelegate {
        let hostingController: UIHostingController<Content>
        @Binding private var scale: CGFloat

        init(content: Content, scale: Binding<CGFloat>) {
            hostingController = UIHostingController(rootView: content)
            _scale = scale
        }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? {
            hostingController.view
        }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            scale = scrollView.zoomScale
        }
    }
}

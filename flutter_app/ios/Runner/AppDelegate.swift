import UIKit
import Flutter
import Photos

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    
    // Setup gallery method channel
    let controller = window?.rootViewController as! FlutterViewController
    let galleryChannel = FlutterMethodChannel(
      name: "com.timelessai.app/gallery",
      binaryMessenger: controller.binaryMessenger
    )
    
    galleryChannel.setMethodCallHandler { [weak self] (call, result) in
      if call.method == "saveToGallery" {
        guard let args = call.arguments as? [String: Any],
              let bytes = args["bytes"] as? FlutterStandardTypedData,
              let fileName = args["fileName"] as? String,
              let isVideo = args["isVideo"] as? Bool else {
          result(FlutterError(code: "INVALID_ARGS", message: "Missing arguments", details: nil))
          return
        }
        
        self?.saveToGallery(data: bytes.data, fileName: fileName, isVideo: isVideo, result: result)
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  private func saveToGallery(data: Data, fileName: String, isVideo: Bool, result: @escaping FlutterResult) {
    PHPhotoLibrary.requestAuthorization { status in
      if status == .authorized || status == .limited {
        if isVideo {
          // Save video
          let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
          do {
            try data.write(to: tempURL)
            PHPhotoLibrary.shared().performChanges({
              PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: tempURL)
            }) { success, error in
              try? FileManager.default.removeItem(at: tempURL)
              if success {
                result(true)
              } else {
                result(FlutterError(code: "SAVE_ERROR", message: error?.localizedDescription, details: nil))
              }
            }
          } catch {
            result(FlutterError(code: "WRITE_ERROR", message: error.localizedDescription, details: nil))
          }
        } else {
          // Save image
          if let image = UIImage(data: data) {
            PHPhotoLibrary.shared().performChanges({
              PHAssetChangeRequest.creationRequestForAsset(from: image)
            }) { success, error in
              if success {
                result(true)
              } else {
                result(FlutterError(code: "SAVE_ERROR", message: error?.localizedDescription, details: nil))
              }
            }
          } else {
            result(FlutterError(code: "INVALID_IMAGE", message: "Could not create image from data", details: nil))
          }
        }
      } else {
        result(FlutterError(code: "PERMISSION_DENIED", message: "Photo library access denied", details: nil))
      }
    }
  }
}

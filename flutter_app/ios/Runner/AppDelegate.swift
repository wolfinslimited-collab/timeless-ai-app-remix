import UIKit
import Flutter
import Photos
import AVFoundation

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    
    let controller = window?.rootViewController as! FlutterViewController
    
    // Gallery channel
    let galleryChannel = FlutterMethodChannel(
      name: "com.wolfine.app/gallery",
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
    
    // FFmpeg channel for video processing
    let ffmpegChannel = FlutterMethodChannel(
      name: "com.wolfine.app/ffmpeg",
      binaryMessenger: controller.binaryMessenger
    )
    
    ffmpegChannel.setMethodCallHandler { [weak self] (call, result) in
      guard let args = call.arguments as? [String: Any] else {
        result(FlutterError(code: "INVALID_ARGS", message: "Missing arguments", details: nil))
        return
      }
      
      switch call.method {
      case "trimVideo":
        self?.handleTrimVideo(args: args, result: result)
      case "concatVideos":
        self?.handleConcatVideos(args: args, result: result)
      case "generateEndingClip":
        self?.handleGenerateEndingClip(args: args, result: result)
      case "overlayVideo":
        self?.handleOverlayVideo(args: args, result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // MARK: - Video Processing via AVFoundation
  
  private func handleTrimVideo(args: [String: Any], result: @escaping FlutterResult) {
    DispatchQueue.global(qos: .userInitiated).async {
      let inputPath = args["inputPath"] as? String ?? ""
      let outputPath = args["outputPath"] as? String ?? ""
      let startTime = args["startTime"] as? Double ?? 0.0
      let duration = args["duration"] as? Double ?? 0.0
      let speed = args["speed"] as? Double ?? 1.0
      let width = args["width"] as? Int ?? 1920
      let height = args["height"] as? Int ?? 1080

      let inputURL = URL(fileURLWithPath: inputPath)
      let outputURL = URL(fileURLWithPath: outputPath)
      
      try? FileManager.default.removeItem(at: outputURL)
      
      let asset = AVURLAsset(url: inputURL)
      let startCMTime = CMTime(seconds: startTime, preferredTimescale: 600)
      let durationCMTime = CMTime(seconds: duration, preferredTimescale: 600)
      let endCMTime = CMTimeAdd(startCMTime, durationCMTime)
      let timeRange = CMTimeRange(start: startCMTime, end: endCMTime)
      
      if speed != 1.0 {
        // Use composition for speed changes
        let composition = AVMutableComposition()
        
        if let videoTrack = asset.tracks(withMediaType: .video).first,
           let compositionVideoTrack = try? composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) {
          try? compositionVideoTrack.insertTimeRange(timeRange, of: videoTrack, at: .zero)
          let scaledDuration = CMTime(seconds: duration / speed, preferredTimescale: 600)
          compositionVideoTrack.scaleTimeRange(
            CMTimeRange(start: .zero, duration: durationCMTime),
            toDuration: scaledDuration
          )
          
          // Preserve transform
          compositionVideoTrack.preferredTransform = videoTrack.preferredTransform
        }
        
        if let audioTrack = asset.tracks(withMediaType: .audio).first,
           let compositionAudioTrack = try? composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
          try? compositionAudioTrack.insertTimeRange(timeRange, of: audioTrack, at: .zero)
          let scaledDuration = CMTime(seconds: duration / speed, preferredTimescale: 600)
          compositionAudioTrack.scaleTimeRange(
            CMTimeRange(start: .zero, duration: durationCMTime),
            toDuration: scaledDuration
          )
        }
        
        guard let exportSession = AVAssetExportSession(asset: composition, presetName: self.presetForSize(width: width, height: height)) else {
          DispatchQueue.main.async { result(false) }
          return
        }
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.shouldOptimizeForNetworkUse = true
        
        exportSession.exportAsynchronously {
          DispatchQueue.main.async {
            result(exportSession.status == .completed)
          }
        }
        return
      }
      
      // Simple trim without speed change
      guard let exportSession = AVAssetExportSession(asset: asset, presetName: self.presetForSize(width: width, height: height)) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      exportSession.outputURL = outputURL
      exportSession.outputFileType = .mp4
      exportSession.timeRange = timeRange
      exportSession.shouldOptimizeForNetworkUse = true
      
      exportSession.exportAsynchronously {
        DispatchQueue.main.async {
          result(exportSession.status == .completed)
        }
      }
    }
  }
  
  private func handleConcatVideos(args: [String: Any], result: @escaping FlutterResult) {
    DispatchQueue.global(qos: .userInitiated).async {
      let concatListPath = args["concatListPath"] as? String ?? ""
      let outputPath = args["outputPath"] as? String ?? ""
      let width = args["width"] as? Int ?? 1920
      let height = args["height"] as? Int ?? 1080
      
      let outputURL = URL(fileURLWithPath: outputPath)
      try? FileManager.default.removeItem(at: outputURL)
      
      guard let listContent = try? String(contentsOfFile: concatListPath, encoding: .utf8) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      let filePaths = listContent.components(separatedBy: "\n")
        .compactMap { line -> String? in
          let trimmed = line.trimmingCharacters(in: .whitespaces)
          if trimmed.hasPrefix("file '") && trimmed.hasSuffix("'") {
            return String(trimmed.dropFirst(6).dropLast(1))
          }
          return nil
        }
      
      if filePaths.isEmpty {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      if filePaths.count == 1 {
        try? FileManager.default.copyItem(atPath: filePaths.first!, toPath: outputPath)
        DispatchQueue.main.async { result(true) }
        return
      }
      
      let composition = AVMutableComposition()
      let compositionVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
      let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
      
      var currentTime = CMTime.zero
      
      for path in filePaths {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        let assetDuration = asset.duration
        let timeRange = CMTimeRange(start: .zero, duration: assetDuration)
        
        if let videoTrack = asset.tracks(withMediaType: .video).first {
          try? compositionVideoTrack?.insertTimeRange(timeRange, of: videoTrack, at: currentTime)
        }
        if let audioTrack = asset.tracks(withMediaType: .audio).first {
          try? compositionAudioTrack?.insertTimeRange(timeRange, of: audioTrack, at: currentTime)
        }
        currentTime = CMTimeAdd(currentTime, assetDuration)
      }
      
      guard let exportSession = AVAssetExportSession(asset: composition, presetName: self.presetForSize(width: width, height: height)) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      exportSession.outputURL = outputURL
      exportSession.outputFileType = .mp4
      exportSession.shouldOptimizeForNetworkUse = true
      
      exportSession.exportAsynchronously {
        DispatchQueue.main.async {
          result(exportSession.status == .completed)
        }
      }
    }
  }
  
  private func handleGenerateEndingClip(args: [String: Any], result: @escaping FlutterResult) {
    DispatchQueue.global(qos: .userInitiated).async {
      let outputPath = args["outputPath"] as? String ?? ""
      let duration = args["duration"] as? Double ?? 2.0
      let text = args["text"] as? String ?? "Thank You"
      let bgColorHex = args["backgroundColor"] as? String ?? "000000"
      let textColorHex = args["textColor"] as? String ?? "FFFFFF"
      let fontSize = args["fontSize"] as? Double ?? 32.0
      let width = args["width"] as? Int ?? 1920
      let height = args["height"] as? Int ?? 1080
      let fps = args["fps"] as? Int ?? 30
      
      let outputURL = URL(fileURLWithPath: outputPath)
      try? FileManager.default.removeItem(at: outputURL)
      
      let bgColor = self.colorFromHex(bgColorHex)
      let txtColor = self.colorFromHex(textColorHex)
      let size = CGSize(width: width, height: height)
      let totalFrames = Int(duration * Double(fps))
      
      // Create the frame image once
      UIGraphicsBeginImageContextWithOptions(size, true, 1.0)
      guard let ctx = UIGraphicsGetCurrentContext() else {
        UIGraphicsEndImageContext()
        DispatchQueue.main.async { result(false) }
        return
      }
      
      ctx.setFillColor(bgColor.cgColor)
      ctx.fill(CGRect(origin: .zero, size: size))
      
      let paragraphStyle = NSMutableParagraphStyle()
      paragraphStyle.alignment = .center
      let scaledFontSize = CGFloat(fontSize) * CGFloat(width) / 1080.0
      let attrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.boldSystemFont(ofSize: scaledFontSize),
        .foregroundColor: txtColor,
        .paragraphStyle: paragraphStyle,
      ]
      let textSize = (text as NSString).boundingRect(
        with: size,
        options: .usesLineFragmentOrigin,
        attributes: attrs,
        context: nil
      )
      let textRect = CGRect(
        x: (size.width - textSize.width) / 2,
        y: (size.height - textSize.height) / 2,
        width: textSize.width,
        height: textSize.height
      )
      (text as NSString).draw(in: textRect, withAttributes: attrs)
      
      let frameImage = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()
      
      guard let cgImage = frameImage?.cgImage else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      // Write video using AVAssetWriter
      guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
      ]
      let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
      let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: writerInput,
        sourcePixelBufferAttributes: [
          kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
          kCVPixelBufferWidthKey as String: width,
          kCVPixelBufferHeightKey as String: height,
        ]
      )
      
      writer.add(writerInput)
      writer.startWriting()
      writer.startSession(atSourceTime: .zero)
      
      let frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps))
      let semaphore = DispatchSemaphore(value: 0)
      var frameIndex = 0
      
      writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoWriterQueue")) {
        while writerInput.isReadyForMoreMediaData && frameIndex < totalFrames {
          guard let pool = adaptor.pixelBufferPool else { break }
          var pixelBuffer: CVPixelBuffer?
          CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
          guard let buffer = pixelBuffer else { break }
          
          CVPixelBufferLockBaseAddress(buffer, [])
          let data = CVPixelBufferGetBaseAddress(buffer)
          let colorSpace = CGColorSpaceCreateDeviceRGB()
          if let context = CGContext(
            data: data,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
          ) {
            context.draw(cgImage, in: CGRect(origin: .zero, size: size))
          }
          CVPixelBufferUnlockBaseAddress(buffer, [])
          
          let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(frameIndex))
          adaptor.append(buffer, withPresentationTime: presentationTime)
          frameIndex += 1
        }
        
        if frameIndex >= totalFrames {
          writerInput.markAsFinished()
          writer.finishWriting {
            DispatchQueue.main.async {
              result(writer.status == .completed)
            }
            semaphore.signal()
          }
        }
      }
      
      semaphore.wait()
    }
  }
  
  private func handleOverlayVideo(args: [String: Any], result: @escaping FlutterResult) {
    DispatchQueue.global(qos: .userInitiated).async {
      let mainVideoPath = args["mainVideoPath"] as? String ?? ""
      let overlayVideoPath = args["overlayVideoPath"] as? String ?? ""
      let outputPath = args["outputPath"] as? String ?? ""
      let x = args["x"] as? Double ?? 0.5
      let y = args["y"] as? Double ?? 0.5
      let overlayWidth = args["overlayWidth"] as? Double ?? 0.35
      let overlayHeight = args["overlayHeight"] as? Double ?? 0.35
      let startTime = args["startTime"] as? Double ?? 0.0
      let endTime = args["endTime"] as? Double ?? 0.0
      let opacity = args["opacity"] as? Double ?? 1.0
      let canvasWidth = args["width"] as? Int ?? 1920
      let canvasHeight = args["height"] as? Int ?? 1080
      
      let mainURL = URL(fileURLWithPath: mainVideoPath)
      let overlayURL = URL(fileURLWithPath: overlayVideoPath)
      let outputURL = URL(fileURLWithPath: outputPath)
      try? FileManager.default.removeItem(at: outputURL)
      
      let mainAsset = AVURLAsset(url: mainURL)
      let overlayAsset = AVURLAsset(url: overlayURL)
      
      let composition = AVMutableComposition()
      
      // Add main video track
      guard let mainVideoTrack = mainAsset.tracks(withMediaType: .video).first,
            let compositionMainTrack = try? composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      let mainDuration = mainAsset.duration
      try? compositionMainTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: mainDuration),
        of: mainVideoTrack,
        at: .zero
      )
      
      // Add main audio track
      if let mainAudioTrack = mainAsset.tracks(withMediaType: .audio).first,
         let compositionAudioTrack = try? composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
        try? compositionAudioTrack.insertTimeRange(
          CMTimeRange(start: .zero, duration: mainDuration),
          of: mainAudioTrack,
          at: .zero
        )
      }
      
      // Add overlay video track
      guard let overlayVideoTrack = overlayAsset.tracks(withMediaType: .video).first,
            let compositionOverlayTrack = try? composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        // If overlay can't be loaded, just export main video
        guard let exportSession = AVAssetExportSession(asset: composition, presetName: self.presetForSize(width: canvasWidth, height: canvasHeight)) else {
          DispatchQueue.main.async { result(false) }
          return
        }
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.exportAsynchronously {
          DispatchQueue.main.async { result(exportSession.status == .completed) }
        }
        return
      }
      
      let overlayStartCMTime = CMTime(seconds: startTime, preferredTimescale: 600)
      let overlayDuration = CMTime(seconds: min(endTime - startTime, overlayAsset.duration.seconds), preferredTimescale: 600)
      
      try? compositionOverlayTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: overlayDuration),
        of: overlayVideoTrack,
        at: overlayStartCMTime
      )
      
      // Create video composition for positioning the overlay
      let videoComposition = AVMutableVideoComposition()
      videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
      videoComposition.renderSize = CGSize(width: canvasWidth, height: canvasHeight)
      
      let instruction = AVMutableVideoCompositionInstruction()
      instruction.timeRange = CMTimeRange(start: .zero, duration: mainDuration)
      
      // Main video layer instruction
      let mainLayerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionMainTrack)
      
      // Scale main video to fit canvas
      let mainNaturalSize = mainVideoTrack.naturalSize
      let mainScaleX = CGFloat(canvasWidth) / mainNaturalSize.width
      let mainScaleY = CGFloat(canvasHeight) / mainNaturalSize.height
      let mainScale = min(mainScaleX, mainScaleY)
      let mainTranslateX = (CGFloat(canvasWidth) - mainNaturalSize.width * mainScale) / 2
      let mainTranslateY = (CGFloat(canvasHeight) - mainNaturalSize.height * mainScale) / 2
      var mainTransform = CGAffineTransform(scaleX: mainScale, y: mainScale)
      mainTransform = mainTransform.translatedBy(x: mainTranslateX / mainScale, y: mainTranslateY / mainScale)
      mainLayerInstruction.setTransform(mainTransform, at: .zero)
      
      // Overlay layer instruction
      let overlayLayerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionOverlayTrack)
      
      // Calculate overlay position and size
      let overlayNaturalSize = overlayVideoTrack.naturalSize
      let overlayPixelW = CGFloat(overlayWidth) * CGFloat(canvasWidth)
      let overlayPixelH = CGFloat(overlayHeight) * CGFloat(canvasHeight)
      let overlayScaleX = overlayPixelW / overlayNaturalSize.width
      let overlayScaleY = overlayPixelH / overlayNaturalSize.height
      let overlayPixelX = CGFloat(x) * CGFloat(canvasWidth) - overlayPixelW / 2
      let overlayPixelY = CGFloat(y) * CGFloat(canvasHeight) - overlayPixelH / 2
      
      var overlayTransform = CGAffineTransform(scaleX: overlayScaleX, y: overlayScaleY)
      overlayTransform = overlayTransform.translatedBy(
        x: overlayPixelX / overlayScaleX,
        y: overlayPixelY / overlayScaleY
      )
      overlayLayerInstruction.setTransform(overlayTransform, at: .zero)
      overlayLayerInstruction.setOpacity(Float(opacity), at: .zero)
      
      // Hide overlay before start and after end
      if startTime > 0 {
        overlayLayerInstruction.setOpacity(0, at: .zero)
        overlayLayerInstruction.setOpacity(Float(opacity), at: overlayStartCMTime)
      }
      let overlayEndCMTime = CMTimeAdd(overlayStartCMTime, overlayDuration)
      overlayLayerInstruction.setOpacity(0, at: overlayEndCMTime)
      
      instruction.layerInstructions = [overlayLayerInstruction, mainLayerInstruction]
      videoComposition.instructions = [instruction]
      
      guard let exportSession = AVAssetExportSession(asset: composition, presetName: self.presetForSize(width: canvasWidth, height: canvasHeight)) else {
        DispatchQueue.main.async { result(false) }
        return
      }
      
      exportSession.outputURL = outputURL
      exportSession.outputFileType = .mp4
      exportSession.videoComposition = videoComposition
      exportSession.shouldOptimizeForNetworkUse = true
      
      exportSession.exportAsynchronously {
        DispatchQueue.main.async {
          result(exportSession.status == .completed)
        }
      }
    }
  }
  
  private func presetForSize(width: Int, height: Int) -> String {
    if width >= 3840 || height >= 2160 {
      if #available(iOS 15.0, *) {
        return AVAssetExportPreset3840x2160
      }
      return AVAssetExportPresetHighestQuality
    } else if width >= 1920 || height >= 1080 {
      return AVAssetExportPresetHighestQuality
    } else if width >= 1280 || height >= 720 {
      return AVAssetExportPreset1280x720
    } else {
      return AVAssetExportPreset640x480
    }
  }
  
  private func colorFromHex(_ hex: String) -> UIColor {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
    var rgb: UInt64 = 0
    Scanner(string: hexSanitized).scanHexInt64(&rgb)
    return UIColor(
      red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
      green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
      blue: CGFloat(rgb & 0xFF) / 255.0,
      alpha: 1.0
    )
  }
  
  // MARK: - Gallery
  
  private func saveToGallery(data: Data, fileName: String, isVideo: Bool, result: @escaping FlutterResult) {
    PHPhotoLibrary.requestAuthorization { status in
      if status == .authorized || status == .limited {
        if isVideo {
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
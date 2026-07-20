import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: extract-alpha-poster.swift input output [seconds] [maxDimension]\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let seconds = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3]) ?? 0.3 : 0.3
let maxDimension = CommandLine.arguments.count > 4 ? CGFloat(Double(CommandLine.arguments[4]) ?? 1600) : 1600

let asset = AVURLAsset(url: inputURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: maxDimension, height: maxDimension)
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 30)

let requestedTime = CMTime(seconds: seconds, preferredTimescale: 600)
var actualTime = CMTime.zero
let image = try generator.copyCGImage(at: requestedTime, actualTime: &actualTime)

guard let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    UTType.png.identifier as CFString,
    1,
    nil
) else {
    throw NSError(domain: "MM.SPoster", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create PNG destination"])
}

CGImageDestinationAddImage(destination, image, [kCGImagePropertyHasAlpha: true] as CFDictionary)
guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "MM.SPoster", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not write PNG"])
}

print("wrote \(outputURL.path) at \(CMTimeGetSeconds(actualTime))s, alpha=\(image.alphaInfo.rawValue)")

// src/utils/autoAdjust.js
import * as ImageManipulator from 'expo-image-manipulator';
import * as FaceDetector from 'expo-face-detector';

/**
 * Prepare a 600x600 PNG for DV compose, detect face, and return:
 * { image600: { uri, base64 }, headBox: { top, bottom } }
 * All coords are in the 600x600 target space (no mapping needed).
 */
export async function prepareDVAutoAdjust(inputUriOrBase64, target = 600) {
  // Normalize input into a manipulatable URI
  const uri = String(inputUriOrBase64).startsWith('data:')
    ? inputUriOrBase64
    : inputUriOrBase64; // works for file:// and data:

  // 1) Force resize to DV target area so coords match server expectations
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: target, height: target } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
  );

  // 2) Face detection on the resized image
  const detection = await FaceDetector.detectFacesAsync(resized.uri, {
    mode: FaceDetector.FaceDetectorMode.fast,
    detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
    runClassifications: FaceDetector.FaceDetectorClassifications.none,
  });

  if (!detection?.faces?.length) {
    return {
      image600: resized,
      headBox: null, // server will just center; export still works
    };
  }

  // Pick largest face
  const faces = detection.faces;
  faces.sort((a, b) => (b.bounds.size.width * b.bounds.size.height) - (a.bounds.size.width * a.bounds.size.height));
  const f = faces[0];

  const y = f.bounds.origin.y;
  const h = f.bounds.size.height;

  // 3) Expand to head box (face bbox ≈ eyebrows→chin; we add top/bottom margins)
  const top    = Math.max(0, Math.floor(y - 0.15 * h)); // add ~15% above for hair
  const bottom = Math.min(target, Math.ceil(y + h + 0.20 * h)); // add ~20% below for chin/neck

  return {
    image600: resized,
    headBox: { top, bottom },
  };
}
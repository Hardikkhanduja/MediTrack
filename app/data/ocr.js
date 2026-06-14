import * as ImagePicker from "expo-image-picker";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const VISION_PROMPT = `Analyze this medicine packaging. Pay close attention to embossed/stamped text on shiny foil. Medicine names are often printed in repeating patterns across the back foil. Pluck out the primary brand or generic name.
To ensure the correct expiry date is found, you MUST think step-by-step. Return a valid JSON object exactly matching this format, with NO markdown backticks or other text:
{
  "analysis": "Briefly list every date you see on the foil and classify them as MFG (manufacturing) or EXP (expiry) to avoid mixing them up",
  "name": "The brand or generic name of the medicine, or empty if not found",
  "expiry": "The true expiry date strictly in YYYY-MM-DD format based on your analysis, or empty if not found",
  "quantity": "Count the number of pill bumps/cavities visible in the blister pack. Return an integer number, or null if you cannot confidently see them."
}`;

export async function scanExpiryDate() {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return { error: "Camera permission denied" };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return { canceled: true };

    const base64Image = result.assets[0].base64;
    const mimeType = result.assets[0].mimeType || "image/jpeg";

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return {
        error: "Missing Gemini API Key. Please check your .env file.",
        rawText: "",
      };
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: VISION_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      console.log("Gemini API Error:", JSON.stringify(errorData));

      return {
        error:
          "Unable to Complete Scan. We couldn't analyze the medicine image at the moment. Please try again later or enter the medicine details manually.",
        rawText: JSON.stringify(errorData),
      };
    }

    const data = await response.json();
    const detectedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!detectedText) {
      return {
        error:
          "We couldn't identify any medicine information in the image. Please try taking a clearer photo.",
        rawText: "NONE",
      };
    }

    try {
      const cleanJson = detectedText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      if (!parsed.expiry && !parsed.name) {
        return {
          error:
            "No medicine details could be detected. Try capturing the medicine strip in better lighting.",
          rawText: detectedText,
        };
      }

      return {
        date: parsed.expiry || "",
        name: parsed.name || "",
        quantity: parsed.quantity || null,
        rawText: detectedText,
      };
    } catch (e) {
      return {
        error:
          "We couldn't process the scan result. Please try scanning again.",
        rawText: detectedText,
      };
    }
  } catch (e) {
    return {
      error:
        "Unable to Complete Scan. Please check your internet connection and try again.",
      rawText: e.message,
    };
  }
}

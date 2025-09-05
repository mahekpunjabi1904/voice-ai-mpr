"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Mic, MicOff, Play, Pause, Square, Volume2, FileText, Upload } from "lucide-react"

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: () => void
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

export default function VoiceSpeechApp() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [textToSpeak, setTextToSpeak] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [pdfText, setPdfText] = useState("")
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const finalTranscriptRef = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      const speechSynthesis = window.speechSynthesis

      if (!SpeechRecognitionAPI || !speechSynthesis) {
        setIsSupported(false)
        return
      }

      recognitionRef.current = new SpeechRecognitionAPI()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = finalTranscriptRef.current
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart
          } else {
            interimTranscript += transcriptPart
          }
        }

        finalTranscriptRef.current = finalTranscript
        setTranscript(finalTranscript + interimTranscript)
      }

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      synthRef.current = speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("")
      finalTranscriptRef.current = ""
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speakText = () => {
    if (synthRef.current && textToSpeak.trim()) {
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 1
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      synthRef.current.speak(utterance)
    }
  }

  const pauseSpeech = () => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause()
    }
  }

  const resumeSpeech = () => {
    if (synthRef.current) {
      synthRef.current.resume()
    }
  }

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const extractTextFromPdf = async (file: File) => {
    setIsProcessingPdf(true)
    try {
      const arrayBuffer = await file.arrayBuffer()

      // Simple PDF text extraction without PDF.js worker
      const uint8Array = new Uint8Array(arrayBuffer)
      const decoder = new TextDecoder("utf-8")
      const text = decoder.decode(uint8Array)

      // Extract readable text from PDF content
      const textMatches = text.match(/$$([^)]+)$$/g) || []
      const extractedText = textMatches
        .map((match) => match.slice(1, -1))
        .filter((text) => text.length > 1 && /[a-zA-Z]/.test(text))
        .join(" ")

      if (extractedText.length > 10) {
        setPdfText(extractedText)
      } else {
        // Fallback: try to use PDF.js with proper worker setup
        const pdfjsLib = await import("pdfjs-dist")

        // Set worker before any PDF operations
        if (typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.js",
            import.meta.url,
          ).toString()
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ""

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map((item: any) => item.str).join(" ")
          fullText += pageText + "\n\n"
        }

        setPdfText(fullText.trim())
      }
    } catch (error) {
      console.error("Error extracting PDF text:", error)
      alert(
        "Unable to extract text from this PDF. Please try a different PDF file or ensure it contains selectable text.",
      )
    } finally {
      setIsProcessingPdf(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      extractTextFromPdf(file)
    } else {
      alert("Please select a valid PDF file.")
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Browser Not Supported</h2>
              <p className="text-muted-foreground">
                Your browser doesn't support speech recognition or synthesis. Please try using Chrome, Edge, or Safari.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Voice, Speech & PDF App</h1>
          <p className="text-muted-foreground text-lg">
            Convert speech to text, text to speech, and extract text from PDFs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Text Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Button size="lg" onClick={triggerFileUpload} disabled={isProcessingPdf} className="h-16 px-8">
                <Upload className="h-6 w-6 mr-2" />
                {isProcessingPdf ? "Processing..." : "Upload PDF"}
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Upload a PDF file to extract text content</p>
            </div>

            <div className="min-h-[120px] p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
              <p className="text-foreground whitespace-pre-wrap">
                {pdfText || "Extracted PDF text will appear here..."}
              </p>
            </div>

            {pdfText && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPdfText("")} className="flex-1">
                  Clear PDF Text
                </Button>
                <Button variant="outline" onClick={() => setTextToSpeak(pdfText)} className="flex-1">
                  Use for Speech
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice to Text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={isListening ? stopListening : startListening}
                className={`h-16 w-16 rounded-full ${
                  isListening ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isListening ? "Listening... Click to stop" : "Click the microphone to start recording"}
              </p>
            </div>

            <div className="min-h-[120px] p-4 bg-muted rounded-lg">
              <p className="text-foreground whitespace-pre-wrap">
                {transcript || "Your transcribed speech will appear here..."}
              </p>
            </div>

            {transcript && (
              <Button variant="outline" onClick={() => setTranscript("")} className="w-full">
                Clear Transcript
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Text to Speech
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter text to convert to speech..."
              value={textToSpeak}
              onChange={(e) => setTextToSpeak(e.target.value)}
              className="min-h-[120px] resize-none"
            />

            <div className="flex gap-2 justify-center">
              <Button
                onClick={speakText}
                disabled={!textToSpeak.trim() || isSpeaking}
                style={{
                  backgroundColor: !textToSpeak.trim() || isSpeaking ? "#4B5563" : "#2563EB",
                  color: "white",
                  opacity: !textToSpeak.trim() || isSpeaking ? 0.7 : 1,
                }}
                className="hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4 mr-2" />
                Speak
              </Button>

              <Button variant="outline" onClick={pauseSpeech} disabled={!isSpeaking}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>

              <Button variant="outline" onClick={resumeSpeech} disabled={!isSpeaking}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>

              <Button variant="outline" onClick={stopSpeech} disabled={!isSpeaking}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>

            {(transcript || pdfText) && (
              <div className="flex gap-2">
                {transcript && (
                  <Button variant="ghost" onClick={() => setTextToSpeak(transcript)} className="flex-1">
                    Use Transcribed Text
                  </Button>
                )}
                {pdfText && (
                  <Button variant="ghost" onClick={() => setTextToSpeak(pdfText)} className="flex-1">
                    Use PDF Text
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTranscript("")
                  finalTranscriptRef.current = ""
                  setTextToSpeak("")
                  setPdfText("")
                  stopSpeech()
                  stopListening()
                }}
                className="w-full"
              >
                Clear All
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (transcript) {
                    navigator.clipboard.writeText(transcript)
                  }
                }}
                disabled={!transcript}
                className="w-full"
              >
                Copy Transcript
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (pdfText) {
                    navigator.clipboard.writeText(pdfText)
                  }
                }}
                disabled={!pdfText}
                className="w-full"
              >
                Copy PDF Text
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

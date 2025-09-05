"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  FileText,
  Upload,
  Download,
  Languages,
  Settings,
  History,
  Search,
} from "lucide-react"
import { ImageIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
  const [ocrText, setOcrText] = useState("")
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState("en-US")
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [textHistory, setTextHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [replaceTerm, setReplaceTerm] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [quickTranslateLang, setQuickTranslateLang] = useState("es")

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const finalTranscriptRef = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() || []
      setAvailableVoices(voices)
      if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0])
      }
    }

    if (synthRef.current) {
      loadVoices()
      synthRef.current.onvoiceschanged = loadVoices
    }
  }, [])

  useEffect(() => {
    const text = textToSpeak.trim()
    setWordCount(text ? text.split(/\s+/).length : 0)
    setCharCount(text.length)
  }, [textToSpeak])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("")
      finalTranscriptRef.current = ""
      recognitionRef.current.lang = selectedLanguage
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

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

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

      const pdfjsLib = await import("pdfjs-dist")

      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

      console.log("[v0] PDF.js version:", pdfjsLib.version)
      console.log("[v0] Worker URL:", pdfjsLib.GlobalWorkerOptions.workerSrc)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true,
      })

      const pdf = await loadingTask.promise

      let fullText = ""

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        const pageText = textContent.items.map((item: any) => item.str).join(" ")

        fullText += pageText + "\n"
      }

      const cleanedText = fullText.replace(/\s+/g, " ").trim()

      if (cleanedText.length > 0) {
        setPdfText(cleanedText)
        console.log("[v0] Successfully extracted text using PDF.js")
      } else {
        setPdfText("No readable text found in this PDF. The PDF may contain only images or be password protected.")
      }
    } catch (error) {
      console.error("[v0] Error extracting PDF text:", error)
      setPdfText("Error processing PDF. Please ensure the file is a valid PDF and try again.")
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

  const extractTextFromImage = async (file: File) => {
    setIsProcessingOcr(true)
    try {
      const Tesseract = await import("tesseract.js")

      console.log("[v0] Starting OCR processing...")

      const {
        data: { text },
      } = await Tesseract.recognize(file, "eng", {
        logger: (m) => console.log("[v0] OCR Progress:", m),
      })

      const cleanedText = text.trim()

      if (cleanedText.length > 0) {
        setOcrText(cleanedText)
        console.log("[v0] Successfully extracted text from image")
      } else {
        setOcrText("No readable text found in this image. Please try an image with clearer text.")
      }
    } catch (error) {
      console.error("[v0] Error extracting text from image:", error)
      setOcrText("Error processing image. Please try again with a different image.")
    } finally {
      setIsProcessingOcr(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      extractTextFromImage(file)
    } else {
      alert("Please select a valid image file (PNG, JPG, JPEG, etc.).")
    }
  }

  const triggerImageUpload = () => {
    imageInputRef.current?.click()
  }

  const saveToHistory = (text: string) => {
    if (text.trim() && !textHistory.includes(text.trim())) {
      setTextHistory((prev) => [text.trim(), ...prev.slice(0, 9)])
    }
  }

  const exportAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const searchAndReplace = () => {
    if (searchTerm && textToSpeak.includes(searchTerm)) {
      const newText = textToSpeak.replaceAll(searchTerm, replaceTerm)
      setTextToSpeak(newText)
      setSearchTerm("")
      setReplaceTerm("")
    }
  }

  const translateText = async (text: string, targetLang: string) => {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
      )
      const data = await response.json()
      return data.responseData.translatedText
    } catch (error) {
      console.error("Translation error:", error)
      return "Translation service unavailable"
    }
  }

  const handleTranslate = async (targetLang: string) => {
    if (textToSpeak.trim()) {
      const translated = await translateText(textToSpeak, targetLang)
      setTextToSpeak(translated)
    }
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
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
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Advanced Voice & Text Processing App</h1>
          <p className="text-muted-foreground text-lg">
            Complete text processing suite with voice recognition, OCR, translation, and more
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Speech Recognition Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="it-IT">Italian</SelectItem>
                    <SelectItem value="pt-BR">Portuguese</SelectItem>
                    <SelectItem value="ja-JP">Japanese</SelectItem>
                    <SelectItem value="ko-KR">Korean</SelectItem>
                    <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Text-to-Speech Voice</label>
                <Select
                  value={selectedVoice?.name || ""}
                  onValueChange={(value) => {
                    const voice = availableVoices.find((v) => v.name === value)
                    setSelectedVoice(voice || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  Clear
                </Button>
                <Button variant="outline" onClick={() => setTextToSpeak(pdfText)} className="flex-1">
                  Use for Speech
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(pdfText)} className="flex-1">
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Text Recognition (OCR)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Button size="lg" onClick={triggerImageUpload} disabled={isProcessingOcr} className="h-16 px-8">
                <Upload className="h-6 w-6 mr-2" />
                {isProcessingOcr ? "Processing..." : "Upload Image"}
              </Button>
            </div>

            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Upload an image (PNG, JPG, etc.) to extract text content</p>
            </div>

            <div className="min-h-[120px] p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
              <p className="text-foreground whitespace-pre-wrap">
                {ocrText || "Extracted image text will appear here..."}
              </p>
            </div>

            {ocrText && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOcrText("")} className="flex-1">
                  Clear
                </Button>
                <Button variant="outline" onClick={() => setTextToSpeak(ocrText)} className="flex-1">
                  Use for Speech
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(ocrText)} className="flex-1">
                  Copy
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTranscript("")} className="flex-1">
                  Clear
                </Button>
                <Button variant="outline" onClick={() => setTextToSpeak(transcript)} className="flex-1">
                  Use for Speech
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(transcript)} className="flex-1">
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Text to Speech & Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Enter text to convert to speech..."
                value={textToSpeak}
                onChange={(e) => {
                  setTextToSpeak(e.target.value)
                  saveToHistory(e.target.value)
                }}
                className="min-h-[120px] resize-none pr-12"
              />
              {textToSpeak && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTextToSpeak("")}
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                >
                  ×
                </Button>
              )}
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Words: {wordCount}</span>
              <span>Characters: {charCount}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input placeholder="Search for..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <Input
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
              />
              <Button variant="outline" onClick={searchAndReplace} disabled={!searchTerm}>
                <Search className="h-4 w-4 mr-2" />
                Replace
              </Button>
            </div>

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

            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Translate:</p>
              <div className="flex gap-2 items-center">
                <Select value={quickTranslateLang} onValueChange={setQuickTranslateLang}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => handleTranslate(quickTranslateLang)}
                  disabled={!textToSpeak.trim()}
                >
                  <Languages className="h-4 w-4 mr-2" />
                  Translate
                </Button>
              </div>
            </div>

            {(transcript || pdfText || ocrText) && (
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
                {ocrText && (
                  <Button variant="ghost" onClick={() => setTextToSpeak(ocrText)} className="flex-1">
                    Use OCR Text
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Text History
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? "Hide" : "Show"}
              </Button>
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {textHistory.length > 0 ? (
                  textHistory.map((text, index) => (
                    <div
                      key={index}
                      className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => setTextToSpeak(text)}
                    >
                      <p className="text-sm truncate">{text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No text history yet</p>
                )}
              </div>
              {textHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setTextHistory([])} className="mt-2">
                  Clear History
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTranscript("")
                  finalTranscriptRef.current = ""
                  setTextToSpeak("")
                  setPdfText("")
                  setOcrText("")
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

              <Button
                variant="outline"
                onClick={() => {
                  if (ocrText) {
                    navigator.clipboard.writeText(ocrText)
                  }
                }}
                disabled={!ocrText}
                className="w-full"
              >
                Copy OCR Text
              </Button>

              <Button
                variant="outline"
                onClick={() => exportAsFile(textToSpeak, "text-to-speech.txt")}
                disabled={!textToSpeak.trim()}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Text
              </Button>

              <Button
                variant="outline"
                onClick={() => exportAsFile(transcript, "transcript.txt")}
                disabled={!transcript}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Transcript
              </Button>

              <Button
                variant="outline"
                onClick={() => exportAsFile(pdfText, "pdf-text.txt")}
                disabled={!pdfText}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF Text
              </Button>

              <Button
                variant="outline"
                onClick={() => exportAsFile(ocrText, "ocr-text.txt")}
                disabled={!ocrText}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export OCR Text
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

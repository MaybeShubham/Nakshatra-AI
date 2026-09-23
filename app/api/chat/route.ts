import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

// Reusable Google GenAI client instance
let cachedAiClient: GoogleGenAI | null = null
function getAiClient(apiKey: string): GoogleGenAI {
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({ apiKey })
  }
  return cachedAiClient
}

const SYSTEM_PROMPT = `You are Nakshatra AI, an approachable scholar and authority on Indian Astronomy and historical mathematical-astronomical traditions.

Core Scope of Expertise:
1. Historical Treatises (Siddhantas): Surya Siddhanta, Aryabhatiya, Brahmasphutasiddhanta, Siddhanta Shiromani.
2. Eminent Astronomers: Aryabhata I & II, Varahamihira, Brahmagupta, Bhaskara I & II, Nilakantha Somayaji, and the Kerala School of Astronomy and Mathematics.
3. Calendrical & Observational Systems: Panchanga mechanics, Tithi, Nakshatra, Rashi, Yoga, Karana, equinoxes, solstices, and calculation of solar and lunar eclipses.
4. Instruments: Yantras of Jantar Mantar (Samrat Yantra, Jai Prakash, Rama Yantra), gnomons (Shanku), and armillary spheres (Gola-yantra).

STRICT RESPONSE & SCOPE RULES:

1. Beginner-Friendly & Concise:
   - Write short, clear, and direct responses suitable for absolute beginners with no prior knowledge of astronomy or mathematics.
   - Explain complex ideas using simple analogies and everyday language.
   - Keep answers brief (2 to 4 short paragraphs max or concise bullet points).
   - Whenever introducing a Sanskrit or technical term, immediately provide a simple English explanation in parentheses (e.g., "Tithi (lunar day)" or "Shanku (gnomon / vertical rod)").

2. Strict Scope Boundary & Out-of-Scope Redirection:
   - If the user asks anything OUTSIDE the domain of Indian Astronomy, historical treatises, mathematical traditions, or calendrical systems (e.g. general coding, pop culture, recipes, modern news, or predictive horoscope readings):
     YOU MUST NOT ANSWER THE OFF-TOPIC QUESTION.
     Politely decline and redirect the user back to Indian Astronomy with 2-3 specific suggested topics (e.g. "I specialize exclusively in Indian Astronomy. Would you like to explore how Aryabhata calculated eclipses, the mechanics of the 27 Nakshatras, or how the Samrat Yantra sundial works?").

3. Mathematical & Observational Focus:
   - Distinguish historically documented observational astronomy and mathematics (Ganita) from later predictive astrology (Phalit). Focus strictly on observational history and mathematics.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // 2. Parse request payload
    const body = await request.json()
    const userContent = body?.message
    let chatId = body?.chat_id

    if (!userContent || typeof userContent !== 'string' || !userContent.trim()) {
      return NextResponse.json(
        { error: 'Message content is required.' },
        { status: 400 }
      )
    }

    const trimmedUserContent = userContent.trim()

    // Generate new chat_id if not provided
    if (!chatId || typeof chatId !== 'string') {
      chatId = crypto.randomUUID()
    }

    // 3. Parallelize user message insertion and context history fetch
    const [insertResult, historyResult] = await Promise.all([
      // Insert user message with fallback if chat_id column is missing
      (async () => {
        let res = await supabase.from('chats').insert({
          chat_id: chatId,
          user_id: user.id,
          role: 'user',
          content: trimmedUserContent,
        })
        if (
          res.error &&
          (res.error.code === 'PGRST204' ||
            res.error.code === '42703' ||
            res.error.message?.includes('chat_id'))
        ) {
          res = await supabase.from('chats').insert({
            user_id: user.id,
            role: 'user',
            content: trimmedUserContent,
          })
        }
        return res
      })(),

      // Fetch past messages with fallback
      (async () => {
        let res = await supabase
          .from('chats')
          .select('role, content')
          .eq('user_id', user.id)
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (
          res.error &&
          (res.error.code === '42703' ||
            res.error.code === 'PGRST204' ||
            res.error.message?.includes('chat_id'))
        ) {
          res = await supabase
            .from('chats')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        }
        return res
      })(),
    ])

    if (insertResult.error) {
      console.error('Error inserting user chat:', insertResult.error)
      return NextResponse.json(
        { error: `Failed to save message: ${insertResult.error.message}` },
        { status: 500 }
      )
    }

    let history: { role: string; content: string }[] = []
    if (historyResult.data) {
      history = [...historyResult.data].reverse()
    }

    // 4. Invoke Gemini API with high-speed 3.8 Flash model
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const ai = getAiClient(apiKey)

    const contents: any[] = []
    history.forEach((msg) => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    })

    let assistantReply = ''
    let primaryModelError = ''
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
    ]

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
          },
        })

        const text =
          response?.text ||
          (response as any)?.output_text ||
          (response as any)?.candidates?.[0]?.content?.parts?.[0]?.text

        if (text) {
          assistantReply = text
          break
        }
      } catch (err: any) {
        if (!primaryModelError) {
          primaryModelError = `[${modelName}]: ${err?.message || String(err)}`
        }
        console.warn(`Model ${modelName} call failed, trying fallback...`, err?.message)
      }
    }

    if (!assistantReply) {
      throw new Error(`Failed to generate response from Gemini API: ${primaryModelError || 'Unknown model error'}`)
    }

    // 5. Asynchronously persist assistant reply (non-blocking for response return)
    ;(async () => {
      try {
        const res = await supabase.from('chats').insert({
          chat_id: chatId,
          user_id: user.id,
          role: 'assistant',
          content: assistantReply,
        })
        if (
          res.error &&
          (res.error.code === 'PGRST204' ||
            res.error.code === '42703' ||
            res.error.message?.includes('chat_id'))
        ) {
          await supabase.from('chats').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantReply,
          })
        }
      } catch (err) {
        console.error('Background insert error:', err)
      }
    })()

    // 6. Return reply immediately
    return NextResponse.json({ reply: assistantReply, chat_id: chatId })
  } catch (error: any) {
    console.error('API /api/chat error:', error)
    return NextResponse.json(
      { error: error?.message || 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ threads: [] })
    }

    // Try fetching with chat_id column
    let primaryFetch = await supabase
      .from('chats')
      .select('id, chat_id, role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    let rawChats = primaryFetch.data
    let fetchError = primaryFetch.error

    // Fallback if chat_id column is not in DB schema yet
    if (
      fetchError &&
      (fetchError.code === '42703' ||
        fetchError.code === 'PGRST204' ||
        fetchError.message?.includes('chat_id'))
    ) {
      const fallbackFetch = await supabase
        .from('chats')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      rawChats = fallbackFetch.data as any
      fetchError = fallbackFetch.error
    }

    if (fetchError || !rawChats) {
      console.error('Error fetching chat history:', fetchError)
      return NextResponse.json({ threads: [] })
    }

    // Group rows by chat_id or id
    const threadsMap = new Map<
      string,
      {
        chat_id: string
        title: string
        updated_at: string
        messages: { id?: string; role: 'user' | 'assistant'; content: string }[]
      }
    >()

    rawChats.forEach((msg) => {
      const threadId = (msg as any).chat_id || msg.id

      if (!threadsMap.has(threadId)) {
        threadsMap.set(threadId, {
          chat_id: threadId,
          title: msg.role === 'user' ? msg.content : 'Chat Conversation',
          updated_at: msg.created_at,
          messages: [],
        })
      }

      const thread = threadsMap.get(threadId)!
      thread.messages.push({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
      thread.updated_at = msg.created_at

      if (msg.role === 'user' && thread.title === 'Chat Conversation') {
        thread.title = msg.content
      }
    })

    const threads = Array.from(threadsMap.values()).reverse()

    return NextResponse.json({ threads })
  } catch (err: any) {
    console.error('GET /api/chats/history error:', err)
    return NextResponse.json({ threads: [] }, { status: 500 })
  }
}

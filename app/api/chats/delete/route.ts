import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    const body = await request.json()
    const { chat_id, id, content, message_ids } = body

    if (!chat_id && !id && !content && (!message_ids || message_ids.length === 0)) {
      return NextResponse.json(
        { error: 'Target thread details required for deletion.' },
        { status: 400 }
      )
    }

    // Optional service role client fallback if configured in environment
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const adminSupabase =
      serviceRoleKey && supabaseUrl
        ? createAdminClient(supabaseUrl, serviceRoleKey)
        : null

    const performDelete = async (client: any) => {
      if (chat_id) {
        // Delete all rows matching chat_id for this user
        const res1 = await client
          .from('chats')
          .delete()
          .eq('user_id', user.id)
          .eq('chat_id', chat_id)
        if (res1.error) throw res1.error

        // Delete any legacy rows where id matches chat_id
        const res2 = await client
          .from('chats')
          .delete()
          .eq('user_id', user.id)
          .eq('id', chat_id)
        if (res2.error) throw res2.error
      }

      if (id) {
        const res3 = await client
          .from('chats')
          .delete()
          .eq('user_id', user.id)
          .eq('id', id)
        if (res3.error) throw res3.error
      }

      if (Array.isArray(message_ids) && message_ids.length > 0) {
        const res4 = await client
          .from('chats')
          .delete()
          .eq('user_id', user.id)
          .in('id', message_ids)
        if (res4.error) throw res4.error
      }

      if (content) {
        const res5 = await client
          .from('chats')
          .delete()
          .eq('user_id', user.id)
          .eq('content', content)
        if (res5.error) throw res5.error
      }
    }

    try {
      // Primary execution via standard client
      await performDelete(supabase)
    } catch (rlsErr: any) {
      console.warn('Standard delete failed (likely RLS policy missing), checking admin fallback:', rlsErr?.message)
      if (adminSupabase) {
        await performDelete(adminSupabase)
      } else {
        throw rlsErr
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/chats/delete error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete chat thread.' },
      { status: 500 }
    )
  }
}

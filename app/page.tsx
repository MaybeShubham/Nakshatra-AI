'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  Send,
  LogOut,
  Plus,
  Search,
  MessageSquare,
  History,
  Menu,
  X,
  BookOpen,
  Calculator,
  Orbit,
  Clock,
  Trash2,
  MoreVertical,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  User,
  Settings,
  Check,
} from 'lucide-react'
import SuryaChakraLogo from '@/components/SuryaChakraLogo'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatThread {
  chat_id: string
  title: string
  updated_at: string
  messages: Message[]
}

const PRESET_AVATARS = [
  { id: 'surya', label: 'Surya', emoji: '☀️', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'chandra', label: 'Chandra', emoji: '🌙', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'nakshatra', label: 'Nakshatra', emoji: '⭐', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'graha', label: 'Graha', emoji: '🪐', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'shanku', label: 'Shanku', emoji: '📐', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
]

const INTERACTIVE_PROMPT_CARDS = [
  {
    title: 'Aryabhata & Eclipse Paths',
    description: 'Calculate planetary periods, epicycles, and eclipse shadow algorithms.',
    prompt: 'How did Aryabhata compute planetary periods and eclipse paths?',
    icon: Calculator,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    title: '27 Nakshatras & 108 Padas',
    description: 'Spatial divisions, 108 Padas, and astronomical zodiac mechanics.',
    prompt: 'Explain the mechanics and divisions of the 27 Nakshatras.',
    icon: Orbit,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    title: 'Samrat Yantra Sundial',
    description: 'How Jantar Mantar gnomons measure solar time with sub-minute precision.',
    prompt: 'How does the Samrat Yantra sundial measure solar time?',
    icon: Clock,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    title: 'Kerala School Calculus',
    description: 'Infinite series expansions for sine and cosine by Madhava of Sangamagrama.',
    prompt: "What was the Kerala School's contribution to infinite series in astronomy?",
    icon: BookOpen,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
]

// Fast regex cleaner for math strings
function cleanMarkdownText(content: string): string {
  if (!content) return ''
  return content
    .replace(/\$\\pi\$/g, 'π')
    .replace(/\\pi/g, 'π')
    .replace(/\$\\circ\$/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\$\\text\{([^}]+)\}\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\$\$/g, '')
}

// Static memoized ReactMarkdown component definitions to prevent component re-mounts on state change
const STATIC_MARKDOWN_COMPONENTS = {
  p: ({ children }: any) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-700 text-xs md:text-sm">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc pl-4 space-y-1 my-2 text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal pl-4 space-y-1 my-2 text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-xs md:text-sm leading-normal">{children}</li>
  ),
  h3: ({ children }: any) => (
    <h3 className="font-bold text-sm text-slate-900 mt-3 mb-1">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="font-bold text-xs text-slate-800 mt-2 mb-1">
      {children}
    </h4>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto max-w-full my-3 rounded-lg border border-slate-200 bg-slate-50">
      <table className="w-full text-left text-xs border-collapse min-w-[300px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-100 text-amber-900 font-semibold border-b border-slate-200">
      {children}
    </thead>
  ),
  th: ({ children }: any) => (
    <th className="p-2 font-medium tracking-wide text-xs">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="p-2 border-b border-slate-200 text-slate-700 text-xs">
      {children}
    </td>
  ),
  pre: ({ children }: any) => (
    <div className="overflow-x-auto max-w-full my-3 rounded-lg border border-slate-200 bg-slate-900 p-3">
      <pre className="font-mono text-xs text-amber-200 whitespace-pre">
        {children}
      </pre>
    </div>
  ),
  code: ({ children }: any) => (
    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-amber-800 font-mono text-xs border border-slate-200">
      {children}
    </code>
  ),
}

export default function ChatPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string>('Scholar')
  const [avatarId, setAvatarId] = useState<string>('surya')
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [tempUsername, setTempUsername] = useState('')
  const [tempAvatarId, setTempAvatarId] = useState('surya')
  const [savingProfile, setSavingProfile] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

  // 1. Concurrently fetch user session and chat threads on mount
  useEffect(() => {
    let isMounted = true

    const initFastSession = async () => {
      try {
        const [userRes, historyRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch('/api/chats/history'),
        ])

        if (!isMounted) return

        if (userRes.data?.user) {
          const user = userRes.data.user
          setUserEmail(user.email || null)

          const metaName = user.user_metadata?.username
          const defaultName = metaName || (user.email ? user.email.split('@')[0] : 'Scholar')
          setUsername(defaultName)
          setTempUsername(defaultName)

          const savedAvatar = user.user_metadata?.avatar_id || 'surya'
          setAvatarId(savedAvatar)
          setTempAvatarId(savedAvatar)
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json()
          if (isMounted && Array.isArray(historyData.threads)) {
            setThreads(historyData.threads)
          }
        }
      } catch (err) {
        console.error('Session init error:', err)
      }
    }

    initFastSession()

    return () => {
      isMounted = false
    }
  }, [])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 2. Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  // 3. Handle Auto-expanding Textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`
    }
  }, [inputMessage])

  // 4. Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chat_id: currentChatId }),
      })

      const data = await res.json()

      if (res.ok && data.reply) {
        const assistantMsg: Message = { role: 'assistant', content: data.reply }
        setMessages((prev) => [...prev, assistantMsg])

        const activeChatId = data.chat_id || currentChatId
        setCurrentChatId(activeChatId)

        setThreads((prevThreads) => {
          const existingIdx = prevThreads.findIndex((t) => t.chat_id === activeChatId)
          if (existingIdx >= 0) {
            const updatedThreads = [...prevThreads]
            updatedThreads[existingIdx] = {
              ...updatedThreads[existingIdx],
              updated_at: new Date().toISOString(),
              messages: [...updatedThreads[existingIdx].messages, userMsg, assistantMsg],
            }
            return updatedThreads
          } else {
            const newThread: ChatThread = {
              chat_id: activeChatId,
              title: text,
              updated_at: new Date().toISOString(),
              messages: [userMsg, assistantMsg],
            }
            return [newThread, ...prevThreads]
          }
        })
      } else {
        const errorMsg: Message = {
          role: 'assistant',
          content: `*Error:* ${data.error || 'Unable to retrieve answer. Please try again.'}`,
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `*Connection Error:* ${err?.message || 'Failed to reach server.'}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // 5. Start Fresh New Chat
  const handleNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setInputMessage('')
  }

  // 6. Select a Chat Thread from Sidebar
  const handleSelectThread = (thread: ChatThread) => {
    setCurrentChatId(thread.chat_id)
    setMessages(thread.messages)
    setSidebarOpen(false)
  }

  // 7. Delete an Entire Chat Thread with Confirmation
  const handleDeleteThread = async (e: React.MouseEvent, thread: ChatThread) => {
    e.stopPropagation()

    const titleSnippet = thread.title.length > 30 ? `${thread.title.substring(0, 30)}...` : thread.title
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the chat conversation "${titleSnippet}"?`
    )

    if (!confirmed) return

    try {
      setThreads((prev) => prev.filter((t) => t.chat_id !== thread.chat_id))

      if (currentChatId === thread.chat_id) {
        setCurrentChatId(null)
        setMessages([])
      }

      const messageIds = thread.messages.map((m) => m.id).filter(Boolean) as string[]

      const res = await fetch('/api/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: thread.chat_id,
          content: thread.title,
          message_ids: messageIds,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('Failed to delete chat in database:', data.error)
        // Refresh threads to match server state if error occurred
        const historyRes = await fetch('/api/chats/history')
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          if (Array.isArray(historyData.threads)) {
            setThreads(historyData.threads)
          }
        }
      }
    } catch (err) {
      console.error('Error deleting thread:', err)
    }
  }

  // 8. Save User Profile Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = tempUsername.trim() || username
    setSavingProfile(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username: cleanName,
          avatar_id: tempAvatarId,
        },
      })

      if (!error) {
        setUsername(cleanName)
        setAvatarId(tempAvatarId)
        setEditProfileOpen(false)
        setProfileMenuOpen(false)
      } else {
        alert(`Failed to update profile: ${error.message}`)
      }
    } catch (err: any) {
      alert(`Error updating profile: ${err?.message || 'Unknown error'}`)
    } finally {
      setSavingProfile(false)
    }
  }

  // 9. Keyboard Shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 10. Logout Handler
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const currentAvatar = useMemo(
    () => PRESET_AVATARS.find((a) => a.id === avatarId) || PRESET_AVATARS[0],
    [avatarId]
  )

  // Filter threads efficiently
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads
    const query = searchQuery.toLowerCase()
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.messages.some((m) => m.content.toLowerCase().includes(query))
    )
  }, [threads, searchQuery])

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-72'}`}
      >
        {/* Top Logo & Collapse Toggle */}
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2.5 ${
                sidebarCollapsed ? 'justify-center w-full' : ''
              }`}
            >
              <SuryaChakraLogo className="w-7 h-7 shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-bold text-base text-slate-900 tracking-tight truncate">
                  Nakshatra AI
                </span>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse Sidebar"
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {sidebarCollapsed ? (
            <button
              onClick={handleNewChat}
              title="New Chat"
              className="w-full p-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-slate-700 flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4 text-amber-700" />
            </button>
          ) : (
            <button
              onClick={handleNewChat}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-700" />
              <span>New Chat</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="px-3.5 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>
        )}

        {/* Recent Chat Threads List */}
        <div className="flex-1 overflow-y-auto px-2 md:px-3.5 py-2 space-y-4">
          <div>
            {!sidebarCollapsed && (
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-600" />
                Recent Conversations
              </div>
            )}

            {filteredThreads.length === 0 ? (
              !sidebarCollapsed && (
                <p className="text-xs text-slate-400 italic px-2 py-1">
                  No recent chats yet
                </p>
              )
            ) : (
              <div className="space-y-1">
                {filteredThreads.map((thread) => {
                  const isActive = currentChatId === thread.chat_id
                  if (sidebarCollapsed) {
                    return (
                      <button
                        key={thread.chat_id}
                        onClick={() => handleSelectThread(thread)}
                        title={thread.title}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-center text-xs transition ${
                          isActive
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                      </button>
                    )
                  }
                  return (
                    <div
                      key={thread.chat_id}
                      onClick={() => handleSelectThread(thread)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                        isActive
                          ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-medium'
                          : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-amber-700' : 'text-slate-400 group-hover:text-amber-600'
                          }`}
                        />
                        <span className="truncate">{thread.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(e, thread)}
                        title="Delete Chat Thread"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card at Bottom */}
        <div className="p-2.5 border-t border-slate-200 bg-slate-50/60 relative" ref={profileRef}>
          {profileMenuOpen && (
            <div
              className={`absolute bottom-16 ${
                sidebarCollapsed ? 'left-16 w-60' : 'left-3 right-3'
              } bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-40 space-y-2 animate-in fade-in duration-150`}
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${currentAvatar.bg}`}>
                  {currentAvatar.emoji}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {username}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail || 'Active Scholar'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  setEditProfileOpen(true)
                }}
                className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 text-xs text-slate-700 font-medium flex items-center gap-2 transition"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-red-50 text-xs text-red-600 font-medium flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full flex items-center bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2 transition text-left ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm border shrink-0 ${currentAvatar.bg}`}>
                {currentAvatar.emoji}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {username}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && <MoreVertical className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50">
        {/* Top Header */}
        <header className="h-12 border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-10 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden md:flex p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <SuryaChakraLogo className="w-5 h-5 md:hidden" />
              <span className="font-semibold text-xs text-slate-600">Nakshatra AI</span>
            </div>
          </div>
        </header>

        {/* Canvas Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            /* Interactive Light Welcome Screen (Renders Immediately without blocking spinner) */
            <div className="h-full flex flex-col justify-between max-w-4xl mx-auto py-4">
              <div className="text-center my-auto space-y-3">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-50 border border-amber-200 shadow-sm mb-2">
                  <SuryaChakraLogo size={48} className="w-12 h-12" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  Hello, {username}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  How can I assist your astronomical research and treatises exploration today?
                </p>
              </div>

              {/* Interactive Prompt Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {INTERACTIVE_PROMPT_CARDS.map((card, idx) => {
                  const IconComp = card.icon
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="text-left p-3.5 rounded-xl bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 transition flex flex-col justify-between group shadow-xs hover:shadow-sm"
                    >
                      <div className="mb-2">
                        <div className={`p-2 rounded-lg border w-fit mb-2.5 ${card.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-xs text-slate-800 group-hover:text-amber-800 transition-colors mb-1">
                          {card.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Explore →
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Active Message Thread List */
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                      <SuryaChakraLogo size={18} className="w-4.5 h-4.5" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed max-w-[92%] sm:max-w-[85%] shadow-xs overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-amber-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-slate max-w-none text-xs md:text-sm leading-relaxed space-y-2">
                        <ReactMarkdown components={STATIC_MARKDOWN_COMPONENTS}>
                          {cleanMarkdownText(msg.content)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm border shrink-0 mt-0.5 ${currentAvatar.bg}`}>
                      {currentAvatar.emoji}
                    </div>
                  )}
                </div>
              ))}

              {/* Animated Loading Indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                    <SuryaChakraLogo size={18} className="w-4.5 h-4.5" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 w-56 space-y-2">
                    <div className="h-2 bg-slate-200 rounded animate-pulse w-full" />
                    <div className="h-2 bg-slate-200 rounded animate-pulse w-4/5" />
                    <div className="h-2 bg-slate-200 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Light Bottom Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto space-y-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="relative flex items-end bg-slate-50 border border-slate-300 rounded-2xl focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/30 transition shadow-xs"
            >
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Surya Siddhanta, Nakshatras, eclipse algorithms..."
                rows={1}
                className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs md:text-sm p-3 pr-11 resize-none focus:outline-none max-h-36 scrollbar-thin"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="absolute right-2 bottom-2 p-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 text-center">
              Nakshatra AI provides scholarly insights into historical Indian astronomy & mathematical traditions.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-700" />
                Customize Profile
              </h2>
              <button
                onClick={() => setEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="e.g. Shubham, Aryabhata"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Choose Astronomical Avatar
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AVATARS.map((avatar) => {
                    const isSelected = tempAvatarId === avatar.id
                    return (
                      <button
                        type="button"
                        key={avatar.id}
                        onClick={() => setTempAvatarId(avatar.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition relative ${
                          isSelected
                            ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xl mb-1">{avatar.emoji}</span>
                        <span className="text-[10px] text-slate-600 font-medium">
                          {avatar.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-amber-600 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

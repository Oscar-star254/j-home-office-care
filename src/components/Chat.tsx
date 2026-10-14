'use client';
import { useEffect, useRef, useState } from 'react';
import { Lock, Send, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/utils';
import type { Message } from '@/lib/types';

export function Chat({ bookingId, meId, unlocked, role, onUnlock, readOnly = false }: {
  bookingId: string; meId: string; unlocked: boolean; role: 'customer' | 'employee' | 'admin'; onUnlock?: () => void; readOnly?: boolean;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!unlocked) return;
    const load = () => supabase.from('messages').select('*').eq('booking_id', bookingId).order('created_at').then(({ data }) => setMsgs((data as Message[]) || []));
    load();
    const ch = supabase.channel('chat-' + bookingId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (p) => setMsgs((m) => (m.some((x) => x.id === (p.new as Message).id) ? m : [...m, p.new as Message])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, unlocked]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  if (!unlocked) {
    return (
      <div className="card flex flex-col items-center px-6 py-10 text-center">
        <span className="rounded-full bg-gold-100 p-4 text-gold-700"><Lock className="h-8 w-8" /></span>
        <p className="mt-3 font-display text-xl text-forest">Chat is locked</p>
        {role === 'customer' ? (
          <>
            <p className="mt-1 max-w-sm text-sm text-forest-500">Pay the booking deposit to start chatting with your provider.</p>
            {onUnlock && <button onClick={onUnlock} className="btn-gold mt-4">Pay deposit to unlock chat</button>}
          </>
        ) : <p className="mt-1 max-w-sm text-sm text-forest-500">Chat opens once the customer pays their deposit.</p>}
      </div>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText(''); setErr('');
    const { error } = await supabase.from('messages').insert({ booking_id: bookingId, sender_id: meId, body });
    if (error) { setErr(error.message); setText(body); }
  };

  return (
    <div className="card flex h-[28rem] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gold/20 bg-forest px-4 py-3 text-white"><MessageCircle className="h-5 w-5 text-gold" /><b className="font-display tracking-wide">Chat</b></div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-forest-50/50 p-4">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-forest-400">No messages yet. Say hello and agree the details.</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3.5 py-2 text-sm ${mine ? 'rounded-br-sm bg-forest text-white' : 'rounded-bl-sm bg-white shadow'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/60' : 'text-forest-400'}`}>{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {readOnly ? <p className="border-t p-3 text-center text-xs text-forest-400">Admin view (read only)</p> : (
        <form onSubmit={send} className="border-t border-gold/20 p-3">
          {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
          <div className="flex gap-2">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" maxLength={2000} />
            <button className="btn-primary !px-4" aria-label="Send"><Send className="h-5 w-5" /></button>
          </div>
        </form>
      )}
    </div>
  );
}

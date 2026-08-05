import { AlertTriangle, RefreshCw } from 'lucide-react'

export function LoadingCards() { return <div className="skeleton-grid" aria-label="Loading"><i /><i /><i /><i /><i /></div> }
export function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <div className="state-card error-state"><AlertTriangle size={28} /><strong>Could not load data</strong><p>{message}</p><button className="primary-button" onClick={retry}><RefreshCw size={18} /> Try again</button></div> }
export function EmptyState({ title, text }: { title: string; text: string }) { return <div className="state-card"><strong>{title}</strong><p>{text}</p></div> }

import ChatList from "@/components/ChatList";
import { MessageIcon } from "@/components/Icons";

export default function MessagesIndex() {
  return (
    <>
      {/* Mobile: full-width list */}
      <ChatList className="flex h-full md:hidden" />

      {/* Desktop: empty state */}
      <div className="hidden h-full flex-col items-center justify-center gap-3 md:flex">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white">
          <MessageIcon size={48} />
        </div>
        <h2 className="text-xl">Your messages</h2>
        <p className="text-sm text-neutral-500">Send a message to start a chat.</p>
      </div>
    </>
  );
}

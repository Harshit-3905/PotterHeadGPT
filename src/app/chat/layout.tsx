export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      {children}
    </div>
  );
}

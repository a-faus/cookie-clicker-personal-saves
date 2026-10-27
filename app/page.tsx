import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import Mirror from "./mirror";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <Mirror account={user ? { name: user.displayName, id: user.userId } : null} signInUrl={chatGPTSignInPath("/")} signOutUrl={chatGPTSignOutPath("/")} />;
}

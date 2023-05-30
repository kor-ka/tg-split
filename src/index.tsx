import { createRoot } from "react-dom/client";
import "./index.css";
import { SessionModel } from "./model/SessionModel";
import reportWebVitals from "./reportWebVitals";
import { MainScreen, ModelContext, UserContext, UsersProvider } from "./view/MainScreen";

const root = createRoot(document.getElementById("root")!);
if (window.location.pathname.startsWith("/tg/")) {
  let { initData, initDataUnsafe, ready } = (window as any).Telegram.WebApp;
  ready();

  const model = new SessionModel(
    { initData, initDataUnsafe }
  );
  const sub = model.balance.subscribe((b) => {
    if (b) {
      sub();
      root.render(
        <ModelContext.Provider value={model}>
          <UserContext.Provider value={model.tgWebApp.user.id}>
            <UsersProvider.Provider value={model.users}>
              <MainScreen model={model} />
            </UsersProvider.Provider>
          </UserContext.Provider>
        </ModelContext.Provider>
      );
    }
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

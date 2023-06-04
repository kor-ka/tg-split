import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { SessionModel } from "./model/SessionModel";
import reportWebVitals from "./reportWebVitals";
import { AddExpenceScreen, AddTransferScreen, MainScreen, ModelContext, UserContext, UsersProvider } from "./view/MainScreen";

const router = createBrowserRouter([
  {
    path: "/tg",
    element: <MainScreen />,
  },
  {
    path: "/tg/addExpence",
    element: <AddExpenceScreen />,
  },
  {
    path: "/tg/addPayment",
    element: <AddTransferScreen />,
  },
]);

const tryInit = () => {
  const wa = (window as any).Telegram.WebApp
  if (!wa) {
    return false
  }
  let { initData, initDataUnsafe, ready } = wa
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
              <RouterProvider router={router} />
            </UsersProvider.Provider>
          </UserContext.Provider>
        </ModelContext.Provider>
      );
    }
  });
  return true
}
const root = createRoot(document.getElementById("root")!);
if (window.location.pathname.startsWith("/tg/")) {
  if (!tryInit()) {
    const interval = setInterval(() => {
      if (tryInit()) {
        clearInterval(interval)
      }
    }, 10)
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

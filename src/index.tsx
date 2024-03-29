import { createRoot } from "react-dom/client";
import { BalanceState } from "./shared/entity";
import "./index.css";
import { SessionModel, SortedBalance } from "./model/SessionModel";
import reportWebVitals from "./reportWebVitals";

const tryInit = () => {
  const wa = (window as any).Telegram?.WebApp
  if (!wa) {
    return false
  }
  let { initData, initDataUnsafe, ready } = wa
  ready();

  wa.MainButton.setParams({ is_active: false, is_visible: true, text: "ADD PAYMENT" })

  const model = new SessionModel(
    { initData, initDataUnsafe }
  );


  import('./view/MainScreen').then(({ renderApp }) => {

    const onBalance = (b: SortedBalance | undefined) => {
      if (b) {
        model.balance.unsubscribe(onBalance)
        root.render(renderApp(model))
      }
    }
    model.balance.subscribe(onBalance);
  })

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

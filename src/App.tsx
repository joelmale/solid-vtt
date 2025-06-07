import { onMount } from "solid-js";
import { db } from "./lib/firebase";
console.log("🔥 Firebase initialized:", db);
import { collection, getDocs } from "firebase/firestore";

function App() {
  onMount(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "messages"));
      querySnapshot.forEach((doc) => {
        console.log(`📦 ${doc.id}:`, doc.data());
      });
    } catch (err) {
      console.error("❌ Error fetching documents:", err);
    }
  });

  return <h1>Hello VTT 👋</h1>;
}

export default App;

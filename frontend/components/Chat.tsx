"use client";
import { useEffect, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { dec2a, formatDate, formatAddress } from "@/util/functions";
import { TransactionBlock } from "@mysten/sui.js/transactions";

interface Message {
  fields: {
    sender: string;
    text: number[];
    timestamp: number;
    ref_id: string;
    metadata: string;
  }
}

export default function Chat() {
  const client = useSuiClient();
  const chatRoomId = "0xca1bda97e8fb23d7866d11df16f4056eaa7a0bee75f876869bad94b091fb97f2";
  const CHAT_PACKAGE_ID = "0xb38572bc4467dc0e7eed592e0b74e83b1db554eefbf9126e064f74dbb50fef59";
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id: chatRoomId,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const [history, setHistory] = useState([] as Message[]);
  const [message, setMessage] = useState("hello");

  async function getMessages() {
    if (data?.data?.content?.dataType !== "moveObject") {
      return null;
    }
    //@ts-ignore
    setHistory(data.data.content.fields.messages as Message[]);
    await refetch();
    const container = document.getElementById("scrollableContainer");
    //@ts-ignore
    container.scrollTop = container.scrollHeight;
  }

  useEffect(() => {
    if (data?.data) {
      getMessages();
    }
    const intervalId = setInterval(getMessages, 5000);

    return () => clearInterval(intervalId);
  }, [account?.address, data, isPending, error])

  const postMessage = () => {

    const txb = new TransactionBlock();

    txb.moveCall({
      arguments: [txb.pure(message), txb.pure(""), txb.object(chatRoomId), txb.pure("0x6")],
      target: `${CHAT_PACKAGE_ID}::chat::post`,
    });

    signAndExecute(
      {
        transactionBlock: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (tx) => {
          client.waitForTransactionBlock({ digest: tx.digest }).then(() => {
            refetch();
          });
        },
        onError: (error) => {
          console.log(error);
        }
      },
    );
  };

  const updateMessage = (e: any) => {
    setMessage(e.target.value);
  };

  return (
    <div className="grid grid-flow-col-1 group rounded-lg border border-transparent px-5 py-4 transition-colors border-gray-300 dark:border-neutral-700 dark:bg-neutral-800/30">
      <h1 className="text-lg">History</h1>
      <div id="scrollableContainer" className="overflow-y-scroll h-72">
        {history.map((message, index) => (

          <div key={index} className={message.fields.sender == account?.address ? "text-right border-b-[1px] border-stone-700 p-2" : "border-b-[1px] border-stone-700 p-2"}>
            <p className={message.fields.sender == account?.address ? "text-stone-400" : ""}>{message.fields.sender == account?.address ? "You: " : formatAddress(message.fields.sender as string) + ": "}{dec2a(message.fields.text)}</p>

            <p className="text-xs">{formatDate(new Date(message.fields.timestamp * 1000))}</p>
          </div>
        ))}
      </div>
      <form className="" onSubmit={(e) => { e.preventDefault(); postMessage(); }}>
        <label className="p-2">Message
          <input type="text" className="z-2000 text-white bg-black p-2 m-2 border-[1px]ot " defaultValue={"Hello"} onChange={updateMessage} />
        </label>
      </form>
      <button className="bg-black border-gray-300 rounded-lg border-[1px] text-white" onClick={postMessage}>Send</button>
    </div>
  )
}
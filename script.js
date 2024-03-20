document
  .getElementById("imageInput")
  .addEventListener("change", function (event) {
    if (this.files && this.files[0]) {
      //   console.log(this.files[0]);
      const reader = new FileReader();

      reader.onload = function (e) {
        // 画像を表示
        const uploadedImageElement = document.getElementById("uploadedImage");
        uploadedImageElement.src = e.target.result;
        uploadedImageElement.style.display = "block";

        // Base64エンコードされたデータを取得（API用）
        const base64Image = e.target.result.split(",")[1];

        // APIを呼び出す
        callApi(base64Image);
      };

      reader.onload = function (e) {
        const base64Image = e.target.result.split(",")[1];
        // console.log(base64Image);
        callApi(base64Image);

        // 画像を表示する処理を追加
        const uploadedImageElement = document.getElementById("uploadedImage");
        uploadedImageElement.src = e.target.result; // 完全なBase64データをsrcにセット
        uploadedImageElement.style.display = "block"; // 画像を表示する
      };

      reader.readAsDataURL(this.files[0]);
    }
  });

function callApi(imageData) {
  const data = {
    model: "llava",
    prompt: "このイメージに何があるか日本語で答えて?",
    images: [imageData],
  };
  const resultDiv = document.getElementById("result");
  //   const loadingDiv = document.getElementById("loading");
  resultDiv.style.display = "block";
  resultDiv.textContent = "Loading...";

  fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      const reader = response.body.getReader();
      let accumulatedText = ""; // 読み取ったテキストを蓄積する変数
      let accumulatedResponse = ""; // response値を蓄積する変数

      function processText({ done, value }) {
        if (done) {
          console.log("Stream complete");
          console.log(accumulatedText); // 最後に蓄積されたテキストをログに出力
          return;
        }

        // チャンクをデコードして蓄積
        accumulatedText += new TextDecoder("utf-8").decode(value);

        // 蓄積されたテキストから完全なJSONオブジェクトを抽出し処理
        try {
          let startPos = 0;
          let endPos = 0;

          // 複数のJSONオブジェクトを処理するためのループ
          while (
            (startPos = accumulatedText.indexOf("{", endPos)) !== -1 &&
            (endPos = accumulatedText.indexOf("}", startPos)) !== -1
          ) {
            const jsonString = accumulatedText.substring(startPos, endPos + 1);
            try {
              const jsonObj = JSON.parse(jsonString);
              if (jsonObj.response) {
                // JSONオブジェクトのresponseプロパティを処理
                console.log(jsonObj.response);
                accumulatedResponse += jsonObj.response; // divに内容を追加
                resultDiv.textContent = accumulatedResponse;
              }
            } catch (e) {
              console.error("Error parsing JSON chunk", e);
            }
            // 処理済みの部分を蓄積テキストから削除
            accumulatedText = accumulatedText.substring(endPos + 1);
            endPos = 0; // インデックスをリセット
          }
        } catch (error) {
          console.error("Error processing accumulated text", error);
        }

        // 次のチャンクを読み取り
        return reader.read().then(processText);
      }

      reader.read().then(processText);
    })
    .catch((error) => {
      console.error(error);
      resultDiv.style.display = "none"; // エラーが発生した場合に表示を非表示にする
    });
}

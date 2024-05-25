import "./style.css"

function IndexPopup() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-[350px]">
      <div className="flex flex-col gap-4 items-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Thank You</h2>
        </div>
        <p className="text-gray-800 dark:text-gray-400 text-xl">
          Thank you for using PickPulse, the live draft board for ESPN fantasy
          football. Please help support our extension by leaving a 5-star
          review!
        </p>
        <button
          className="flex bg-violet-500 p-2 w-[140px] rounded-lg text-lg text-center items-center font-semibold"
          onClick={() =>
            window.open(
              "https://chromewebstore.google.com/detail/ffdraftboard/ljnelhiofbippkmbeioamhnjihkecgbj"
            )
          }>
          Leave a Review
        </button>
      </div>
    </div>
  )
}

export default IndexPopup

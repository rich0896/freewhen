// Days of the week
const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

// Add a new friend with a weekly calendar
function addFriend() {
	const friendId = Date.now();
	const friendElement = document.createElement("div");
	friendElement.className =
		"friend bg-white dark:bg-gray-800 rounded-xl shadow p-6 animated hover:shadow-md transition-shadow mr-4"; // Added 'friend' class
	friendElement.innerHTML = `
<div class="flex items-center justify-between mb-4">
<input type="text" placeholder="Friend Name" 
    class="friend-name bg-transparent text-lg font-medium text-gray-800 dark:text-white border-b-2 focus:outline-none focus:border-blue-500 mr-4">

<button onclick="this.closest('div').remove()" 
    class="text-sm text-gray-100 px-3 py-1 rounded-md bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
    Remove
</button>
</div>
<div class="calendar-grid mt-4">
${DAYS.map(
	(day) => `
    <div class="day-column">
        <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-2">${day}</h3>
        <div class="busy-times-${day.toLowerCase()} space-y-2"></div>
        <button onclick="addBusyTime('${day.toLowerCase()}', this)" 
            class="text-sm text-gray-100 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mt-2">
            + Add Busy Time
        </button>
    </div>
`
).join("")}
</div>
`;

	friendsContainer.appendChild(friendElement);
}

// Add a busy time block for a specific day with flatpickr
function addBusyTime(day, button) {
	const container = button
		? button.previousElementSibling
		: document.querySelector(`.busy-times-${day}`);
	const timeBlock = document.createElement("div");
	timeBlock.className = "time-input-group";
	timeBlock.innerHTML = `
<input type="text" class="p-1.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-white timepicker w-20 text-center">
<span class="text-gray-500 dark:text-gray-400">to</span>
<input type="text" class="p-1.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-white timepicker w-20 text-center">
<button onclick="this.parentElement.remove()" class="ml-2 text-red-500 hover:text-red-600 transition-colors">✕</button>
`;
	container.appendChild(timeBlock);

	// Initialize flatpickr time pickers
	timeBlock.querySelectorAll(".timepicker").forEach((input) => {
		flatpickr(input, {
			enableTime: true,
			noCalendar: true,
			dateFormat: "H:i",
		});
	});
}

// Calculate common free times for each day
function calculateFreeTime() {
	const results = document.getElementById("results");
	results.innerHTML = "";

	function minutesTo12Hour(minutes) {
		let hrs = Math.floor(minutes / 60);
		const mins = (minutes % 60).toString().padStart(2, "0");
		const ampm = hrs >= 12 ? "PM" : "AM";
		hrs = hrs % 12 || 12;
		return `${hrs}:${mins} ${ampm}`;
	}

	function minutesToPosition(minutes) {
		return (minutes / 1440) * 100; // 1440 minutes in a day
	}

	function createTimelineBlock(start, end, color, label) {
		const block = document.createElement("div");
		block.className = `h-8 rounded ${color} absolute`;
		block.style.left = `${minutesToPosition(start)}%`;
		block.style.width = `${minutesToPosition(end - start)}%`;
		block.title = `${minutesTo12Hour(start)} - ${minutesTo12Hour(
			end
		)} ${label}`;
		return block;
	}

	function updateVisualCalendar() {
		const container = document.getElementById("calendarTimeline");
		container.innerHTML = "";

		DAYS.forEach((day) => {
			const dayRow = document.createElement("div");
			dayRow.className = "relative h-10";

			// Day label
			const dayLabel = document.createElement("div");
			dayLabel.className =
				"left-0 w-20 text-left pr-2 text-sm font-bold text-gray-600 dark:text-gray-400";
			dayLabel.textContent = day;
			dayRow.appendChild(dayLabel);

			// Timeline background (full day)
			const timeline = document.createElement("div");
			timeline.className =
				"h-8 bg-gray-200 dark:bg-gray-700 rounded absolute w-full";
			dayRow.appendChild(timeline);

			// Add time markers
			for (let hour = 0; hour <= 24; hour++) {
				const marker = document.createElement("div");
				marker.className =
					"absolute top-7 h-4 border-l border-gray-300 dark:border-gray-600";
				marker.style.left = `${(hour / 24) * 100}%`;
				dayRow.appendChild(marker);
			}

			// Add busy times (from all friends)
			const allBusy = [];
			document.querySelectorAll(".friend").forEach((friend) => {
				friend
					.querySelectorAll(`.busy-times-${day.toLowerCase()} > div`)
					.forEach((timeInput) => {
						const [startInput, endInput] = timeInput.querySelectorAll("input");
						const start = timeToMinutes(startInput.value);
						const end = timeToMinutes(endInput.value);
						if (start && end) allBusy.push({ start, end });
					});
			});

			mergeIntervals(allBusy.sort((a, b) => a.start - b.start)).forEach(
				(interval) => {
					timeline.appendChild(
						createTimelineBlock(
							interval.start,
							interval.end,
							"bg-red-400/80 dark:bg-red-600/80",
							"Busy"
						)
					);
				}
			);

			// Add free times
			const freeTimes = getFreeIntervals(mergeIntervals(allBusy));
			freeTimes.forEach((interval) => {
				timeline.appendChild(
					createTimelineBlock(
						interval.start,
						interval.end,
						"bg-green-400/80 dark:bg-green-600/80",
						"Free"
					)
				);
			});

			container.appendChild(dayRow);
		});

		// Add time labels
		const timeLabels = document.createElement("div");
		timeLabels.className =
			"flex justify-between text-sm text-gray-600 dark:text-gray-400";
		for (let hour = 0; hour <= 24; hour++) {
			const label = document.createElement("span");
			label.textContent = `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;
			timeLabels.appendChild(label);
		}
		container.appendChild(timeLabels);
	}

	DAYS.forEach((day) => {
		const allBusy = [];
		let isValid = true;

		document.querySelectorAll(".friend").forEach((friend) => {
			const busyTimes = [];
			friend
				.querySelectorAll(`.busy-times-${day.toLowerCase()} > div`)
				.forEach((timeInput) => {
					const [startInput, endInput] = timeInput.querySelectorAll("input");
					const start = timeToMinutes(startInput.value);
					const end = timeToMinutes(endInput.value);

					if (!startInput.value || !endInput.value) {
						showError("Please fill all time fields");
						isValid = false;
					}

					if (start >= end) {
						showError("End time must be after start time");
						isValid = false;
					}

					if (isValid) busyTimes.push({ start, end });
				});
			allBusy.push(...busyTimes);
		});

		if (!isValid) return;

		const merged = mergeIntervals(allBusy.sort((a, b) => a.start - b.start));
		const freeTime = getFreeIntervals(merged);

		if (freeTime.length > 0) {
			results.innerHTML += `
    <div class="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg p-4">
        <h3 class="font-semibold mb-2">${day}</h3>
        ${freeTime
					.map(
						(interval) => `
            <div class="flex items-center gap-2">
                <span>✅</span>
                <span>${minutesTo12Hour(interval.start)} - ${minutesTo12Hour(
							interval.end
						)}</span>
            </div>
        `
					)
					.join("")}
    </div>
`;
		}
	});

	if (!results.innerHTML) {
		results.innerHTML = `
<div class="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
    No common free time found this week 😢
</div>
`;
	}
	updateVisualCalendar();
}

// Utility functions

function timeToMinutes(time) {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
}

function minutesToTime(minutes) {
	const hrs = Math.floor(minutes / 60)
		.toString()
		.padStart(2, "0");
	const mins = (minutes % 60).toString().padStart(2, "0");
	return `${hrs}:${mins}`;
}

function mergeIntervals(intervals) {
	if (intervals.length === 0) return [];
	const merged = [intervals[0]];
	for (let i = 1; i < intervals.length; i++) {
		const last = merged[merged.length - 1];
		const current = intervals[i];
		if (current.start <= last.end) {
			last.end = Math.max(last.end, current.end);
		} else {
			merged.push(current);
		}
	}
	return merged;
}

function getFreeIntervals(busyIntervals) {
	const dayStart = 0; // 00:00
	const dayEnd = 1439; // 23:59
	const free = [];
	let previousEnd = dayStart;

	for (const interval of busyIntervals) {
		if (interval.start > previousEnd) {
			free.push({ start: previousEnd, end: interval.start });
		}
		previousEnd = Math.max(previousEnd, interval.end);
	}

	if (previousEnd < dayEnd) {
		free.push({ start: previousEnd, end: dayEnd });
	}

	return free;
}

function showError(message) {
	const existingError = document.querySelector(".error-message");
	if (existingError) existingError.remove();

	const errorDiv = document.createElement("div");
	errorDiv.className =
		"error-message p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg mb-4 animated";
	errorDiv.textContent = message;
	document.getElementById("results").prepend(errorDiv);

	setTimeout(() => errorDiv.remove(), 3000);
}

// Initialize first friend
addFriend();

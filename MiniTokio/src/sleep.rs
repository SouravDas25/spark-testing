
use crate::task::{Task, TaskState};
use std::cmp::Reverse;
use std::collections::BinaryHeap;
use std::future::Future;
use std::task::{Context, Poll, Waker};
use std::time::{Duration, Instant};

// Structure to hold timeout tasks
struct TimeoutTask {
    deadline: Instant,
    waker: Waker,
}

impl PartialEq for TimeoutTask {
    fn eq(&self, other: &Self) -> bool {
        self.deadline == other.deadline
    }
}

impl PartialOrd for TimeoutTask {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        other.deadline.partial_cmp(&self.deadline)
    }
}

impl Eq for TimeoutTask {}

impl Ord for TimeoutTask {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other.deadline.cmp(&self.deadline)
    }
}

// Timer wheel that manages timeouts
pub struct TimeoutWorker {
    tasks: BinaryHeap<Reverse<TimeoutTask>>,
}

impl TimeoutWorker {
    pub fn new() -> Self {
        Self {
            tasks: BinaryHeap::new(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.tasks.is_empty()
    }

    pub fn schedule(&mut self, duration: Duration, waker: Waker) {
        let deadline = Instant::now() + duration;
        let task = TimeoutTask { deadline, waker };
        self.tasks.push(Reverse(task));
    }

    // Check and execute any due tasks
    pub fn tick(&mut self) {
        let now = Instant::now();
        while let Some(Reverse(task)) = self.tasks.peek() {
            if task.deadline <= now {
                if let Some(Reverse(task)) = self.tasks.pop() {
                    // ask the executor to poll again
                    task.waker.wake_by_ref();
                }
            } else {
                break;
            }
        }
    }
}

pub struct SleepFuture {
    state: TaskState,
    duration: Duration,
}

impl Future for SleepFuture {
    type Output = ();

    fn poll(mut self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        println!("polled sleep");
        match self.state {
            TaskState::Pending => {
                self.state = TaskState::Running;

                Task::submit_timeout(cx, self.duration);

                Poll::Pending
            }
            TaskState::Running => Poll::Ready(()),
        }
    }
}

pub fn my_sleep(duration: Duration) -> SleepFuture {
    SleepFuture {
        state: TaskState::Pending,
        duration,
    }
}

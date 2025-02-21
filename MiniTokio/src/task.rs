use crate::executors::{BoxedFuture, MyExecutor, Queue};
use futures::task::ArcWake;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};

#[derive(Clone)]
pub enum TaskState {
    Pending,
    Running,
}

pub struct Task {
    future: Mutex<BoxedFuture>,
    queue: Queue,
}

impl Task {
    pub fn new(future: BoxedFuture, queue: Queue) -> Arc<Task> {
        Arc::new(Task {
            future: Mutex::new(future),
            queue,
        })
    }

    pub fn poll(self: &Self, context: &mut Context<'_>) -> Poll<()> {
        let mut future = self.future.lock().unwrap();
        return future.as_mut().poll(context);
    }
}

impl ArcWake for Task {
    fn wake_by_ref(arc_self: &Arc<Self>) {
        arc_self.queue.lock().unwrap().push_back(arc_self.clone());
    }
}
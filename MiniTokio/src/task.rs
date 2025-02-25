use crate::executors::{BoxedFuture, MyExecutor};
use futures::task::ArcWake;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use std::time::Duration;
use crate::io::IoTask;

#[derive(Clone)]
pub enum TaskState {
    Pending,
    Running,
}

pub struct Task {
    future: Mutex<BoxedFuture>,
    executor: MyExecutor,
}

impl Task {
    pub fn new(future: BoxedFuture, executor: MyExecutor) -> Arc<Task> {
        Arc::new(Task {
            future: Mutex::new(future),
            executor,
        })
    }

    pub fn poll(self: &Self, context: &mut Context<'_>) -> Poll<()> {
        let mut future = self.future.lock().unwrap();
        return future.as_mut().poll(context);
    }

    pub fn submit_io(cx: &mut Context<'_>, io_task: IoTask) {
        let task: *const Task = cx.waker().data().cast();
        if !task.is_aligned() {
            panic!("only works with MyExecutor");
        }
        unsafe {
            let executor = &(*task).executor;
            executor.submit_io_task(io_task);
        }
    }

    pub fn submit_timeout(cx: &mut Context<'_>, duration: Duration) {
        let task: *const Task = cx.waker().data().cast();
        if !task.is_aligned() {
            panic!("only works with MyExecutor");
        }
        unsafe {
            let executor = &(*task).executor;
            executor.submit_timeout(duration, cx.waker().clone());
        }
    }
}

impl ArcWake for Task {
    fn wake_by_ref(arc_self: &Arc<Self>) {
        arc_self.executor.add_task(arc_self.clone());
    }
}
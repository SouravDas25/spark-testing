use crate::sleep::TimeoutWorker;

use crate::io::{FileWorker, IoTask};
use crate::task::Task;
use futures::future::BoxFuture;
use futures::FutureExt;
use std::collections::VecDeque;
use std::future::Future;
use std::sync::{Arc, Mutex};
use std::task::{Context, Waker};
use std::time::Duration;

pub type BoxedFuture = BoxFuture<'static, ()>;
pub type ThreadSafe<T> = Arc<Mutex<T>>;
pub type Queue = ThreadSafe<VecDeque<Arc<Task>>>;

#[derive(Clone)]
pub struct MyExecutor {
    queue: Queue,
    timeout_worker: Arc<Mutex<TimeoutWorker>>,
    file_worker: Arc<Mutex<FileWorker>>,
}

impl MyExecutor {
    pub fn new() -> Self {
        MyExecutor {
            queue: Arc::new(Mutex::new(VecDeque::new())),
            timeout_worker: Arc::new(Mutex::new(TimeoutWorker::new())),
            file_worker: Arc::new(Mutex::new(FileWorker::new())),
        }
    }

    fn pop_task(&self) -> Option<Arc<Task>> {
        self.queue.lock().unwrap().pop_front()
    }

    fn run_io(&self) {
        self.file_worker.lock().unwrap().run();
    }

    fn run_timeout(&self) {
        self.timeout_worker.lock().unwrap().tick();
    }

    fn has_pending_task(&self) -> bool {
        let timer = self.timeout_worker.lock().unwrap();
        let file_worker = self.file_worker.lock().unwrap();
        let queue = self.queue.lock().unwrap();
        if timer.is_empty() && file_worker.is_empty() && queue.is_empty() {
            return false;
        }
        true
    }

    pub fn finish_all(&self) {
        while self.has_pending_task() {
            // Event Loop
            while let Some(task) = self.pop_task() {
                let waker = futures::task::waker(task.clone());
                let mut cx = Context::from_waker(&waker);
                let _ = task.poll(&mut cx);
            }

            // IO Loops
            self.run_timeout();
            self.run_io();
        }
    }
}

impl MyExecutor {
    fn spawn_inner(&self, future: BoxedFuture) {
        let task = Task::new(future, self.clone());
        self.queue.lock().unwrap().push_back(task);
    }

    pub fn add_task(&self, task: Arc<Task>) {
        self.queue.lock().unwrap().push_back(task);
    }

    pub fn submit_io_task(&self, io_task: IoTask) {
        self.file_worker.lock().unwrap().add_task(io_task);
    }

    pub fn submit_timeout(&self, duration: Duration, waker: Waker) {
        self.timeout_worker
            .lock()
            .unwrap()
            .schedule(duration, waker);
    }

    pub fn block_on<F: Future<Output = ()> + Send + 'static>(&self, future: F) {
        self.spawn_inner(future.boxed());
        self.finish_all();
    }

    pub fn spawn<F: Future<Output = ()> + Send + 'static>(&self, future: F) {
        self.spawn_inner(future.boxed());
    }
}

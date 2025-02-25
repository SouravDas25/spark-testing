use crate::executors::{ThreadSafe};
use crate::task::{Task, TaskState};
use std::cmp::min;
use std::collections::VecDeque;
use std::fs;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};

pub type PathRef = ThreadSafe<PathBuf>;
pub type BufferRef = ThreadSafe<Vec<u8>>;
pub enum IoTask {
    READ(Waker, PathRef, BufferRef),
    WRITE(Waker, PathRef, BufferRef),
}
pub struct FileWorker {
    io_tasks: VecDeque<IoTask>,
}

impl FileWorker {
    pub fn new() -> FileWorker {
        FileWorker {
            io_tasks: VecDeque::new(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.io_tasks.is_empty()
    }

    pub fn add_task(&mut self, io_task: IoTask) {
        self.io_tasks.push_back(io_task);
    }

    pub fn run(&mut self) {
        for task in self.io_tasks.drain(..min(5, self.io_tasks.len())) {
            match task {
                IoTask::READ(waker, path_ref, buff) => {
                    let path = path_ref.lock().unwrap();
                    println!("reading data");
                    let data = fs::read(path.as_path()).unwrap();
                    buff.lock().unwrap().extend(data);
                    waker.wake_by_ref();
                }
                IoTask::WRITE(waker, path, data) => {
                    println!("writing data");
                    fs::write(
                        path.lock().unwrap().as_path(),
                        data.lock().unwrap().as_slice(),
                    )
                    .unwrap();
                    waker.wake_by_ref();
                }
            }
        }
    }
}

pub struct WriteFuture {
    state: TaskState,
    path: PathRef,
    buffer: BufferRef,
}
impl Future for WriteFuture {
    type Output = ();

    fn poll(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Self::Output> {
        println!("polled -> write");
        match self.state {
            TaskState::Pending => {
                self.state = TaskState::Running;

                let io_task =
                    IoTask::WRITE(cx.waker().clone(), self.path.clone(), self.buffer.clone());

                Task::submit_io(cx, io_task);

                Poll::Pending
            }
            TaskState::Running => Poll::Ready(()),
        }
    }
}

pub fn my_write<P: AsRef<Path>, C: AsRef<[u8]>>(path: P, data: C) -> WriteFuture {
    let path = PathBuf::from(path.as_ref());
    let data = Vec::from(data.as_ref());
    WriteFuture {
        state: TaskState::Pending,
        path: Arc::new(Mutex::new(path)),
        buffer: Arc::new(Mutex::new(data)),
    }
}

pub struct ReadFuture {
    state: TaskState,
    path: PathRef,
    buffer: BufferRef,
}

impl Future for ReadFuture {
    type Output = String;

    fn poll(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Self::Output> {
        println!("polled -> read");
        match self.state {
            TaskState::Pending => {
                let io_task =
                    IoTask::READ(cx.waker().clone(), self.path.clone(), self.buffer.clone());

                // ask the executor to poll back after the completing the read
                Task::submit_io(cx, io_task);

                self.state = TaskState::Running;

                Poll::Pending
            }
            TaskState::Running => {
                let buff = self.buffer.lock().unwrap();
                let s = String::from_utf8_lossy(buff.as_slice());
                Poll::Ready(s.to_string())
            }
        }
    }
}

pub fn my_read<P: AsRef<Path>>(path: P) -> ReadFuture {
    let path = PathBuf::from(path.as_ref());
    let data: Vec<u8> = Vec::new();
    ReadFuture {
        state: TaskState::Pending,
        path: Arc::new(Mutex::new(path)),
        buffer: Arc::new(Mutex::new(data)),
    }
}

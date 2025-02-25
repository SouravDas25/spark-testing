mod executors;
mod io;
mod sleep;
mod task;

use crate::executors::MyExecutor;
use crate::io::{my_read, my_write};
use std::time::Duration;
use crate::sleep::my_sleep;

async fn show_content(i: i32) {
    println!("show from async({}) function", i);
    let data = my_read("test.txt").await;
    println!("file content-{}! {}", i, data);
}

async fn write_content(i: i32) {
    println!("write from async({}) function", i);
    let data = "Hello, World";
    my_write("test.txt", data).await;
    println!("file content-{} written!", i);
}

async fn sleep(i: i32) {
    println!("sleep from async({}) function", i);
    my_sleep(Duration::from_secs(2)).await;
    println!("sleep({}) done!", i);
}

fn main() {
    let executor = MyExecutor::new();
    for i in 0..1 {
        executor.spawn(write_content(i));
        executor.spawn(sleep(i));
        executor.spawn(show_content(i));
    }
    // this will block the thread to complete all task
    executor.finish_all();

}
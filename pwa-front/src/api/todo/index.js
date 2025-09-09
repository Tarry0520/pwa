export function getTodoList(query) {
  return this.$api({
    url: '/api/todo',
    method: 'get',
    query,
  })
}

export function addTodo(data) {
  return this.$api({
    url: '/api/todo',
    method: 'post',
    data,
  })
}

export function updateTodo(data) {
  return this.$api({
    url: '/api/todo',
    method: 'put',
    data,
  })
}

export function deleteTodo(id) {
  return this.$api({
    url: '/api/todo',
    method: 'delete',
    params: { id },
  })
}

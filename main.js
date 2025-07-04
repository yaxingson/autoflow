import { readFileSync } from 'node:fs'
import repl from 'node:repl'
import { OpenAI } from 'openai'
import * as dotenv from 'dotenv'
import * as sqlite from 'sqlite'

dotenv.config()

const employeesTableCreateSQL = `
CREATE TABLE employees (
  id INT PRIMARY KEY NOT NULL, -- 主键
  employee_id INT NOT NULL, -- 员工ID
  name CHAR(20) NOT NULL, -- 员工姓名
  email CHAR(30) NOT NULL, -- 员工的电子邮件
  status INT NOT NULL -- 员工当前状态，整数类型，0表示离职状态，1表示在职状态
)
`

const employees = [
  {id:1, employee_id: 14424, name:'Jerry Morrison', email:'gipze@ufup.so', status: 0},
  {id:2, employee_id: 13082, name:'Bryan Rice', email:'goduji@ta.sl', status: 1},
  {id:3, employee_id: 19808, name:'Jon Bowers', email:'vu@go.cg', status: 0},
  {id:4, employee_id: 12093, name:'Jessie Page', email:'bis@tozsi.uk', status: 0},
  {id:5, employee_id: 16737, name:'Kate Ellis', email:'zow@etadifdut.ky', status: 0},
  {id:6, employee_id: 18926, name:'Jeffrey Medina', email:'jidepnah@cu.sh', status: 1},
  {id:7, employee_id: 10934, name:'Louis Alvarez', email:'ofkev@wa.il', status: 0},
]

!(async ()=>{
  try {
    const db = await sqlite.open({
      filename:'./sqlite.db',
      driver:sqlite.Database
    })

    await db.exec(employeesTableCreateSQL)
    const insert = await db.prepare('INSERT INTO employees VALUES (?, ?, ?, ?, ?)')

    for await (const {id, employee_id, name, email, status} of employees) {
      await insert.run(id, employee_id, name, email, status)
    }
  } catch(e) {
    console.log(e)
  }
})()

class DateToolkit {
  static getCurrentTime() {
    const now = new Date()
    return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
  }
}

class CodeInterpreterToolkit {
  static jsREPL({ code }) {
    code = code.replaceAll(/console\.log\(\s*(.*)\s*\)/g, '$1')
    return eval(code)
  }
}

class CalculatorToolkit {
  static mul({ a, b }) {
    return a * b
  }
  static add({ a, b }) {
    return a + b
  }
}

class DatabaseToolkit {
  static text2sql() {

  }
}

class WebSearchToolkit {
  static serpAPI() {

  }
}

class FileToolkit {
  static readFile({ path }) {
    const content = readFileSync(path, { encoding:'utf-8' })
    return content
  }
}

const AVAILABLE_TOOLS = {
  'getCurrentTime': DateToolkit.getCurrentTime,
  'jsREPL': CodeInterpreterToolkit.jsREPL,
  'mul': CalculatorToolkit.mul,
  'add': CalculatorToolkit.add,
  'text2sql': DatabaseToolkit.text2sql,
  'serpAPI': WebSearchToolkit.serpAPI,
  'readFile': FileToolkit.readFile,
}

class Node {
  async invoke(data) {}
}

class TriggerNode extends Node {
  async invoke() {
    return {
      'type':'manual'
    }
  }
}

class ChatModelNode extends Node {
  constructor(options) {
    super()
    const {
      modelName = 'gpt-4o-mini',
      provider = 'openai',
      systemMessage = '', 
      userMessage = '',
    } = options

    this.client = new OpenAI()
    this.modelName = modelName
    this.messages = [
      {role:'system', content:systemMessage},
      {role:'user', content:userMessage}
    ]
  }
  
  async getCompletion(messages, tools=[]) {
    const completion = await this.client.chat.completions.create({
      model:this.modelName,
      messages,
      tools
    })
    const message = completion.choices[0].message
    return message
  }

  async invoke(data) {
    const message = await this.getCompletion(this.messages)
    return {
      output: message.content
    }
  }
}

class AIAgentNode extends Node {
  constructor(chatModel, tools) {
    super()
    this.chatModel = chatModel
    this.tools = tools
  }

  async invoke() {
    const { messages } = this.chatModel
    
    let aiMessage = await this.chatModel.getCompletion(messages, this.tools)
    messages.push(aiMessage)

    while (aiMessage.tool_calls) {
      for(const toolCall of aiMessage.tool_calls) {
        const toolFn = toolCall.function
        const args = JSON.parse(toolFn.arguments)
        const result = AVAILABLE_TOOLS[toolFn.name](args.options)
        messages.push({
          role:'tool', 
          tool_call_id:toolCall.id, 
          name:toolFn.name, 
          content:`${result}`}
        )
        
      }
      aiMessage = await this.chatModel.getCompletion(messages, this.tools)
      messages.push(aiMessage)
    }

    return {
      'output':aiMessage.content
    }
  }
}

class HTTPRequestNode extends Node {}
class FunctionNode extends Node {}
class BranchNode extends Node {}
class SwitchNode extends Node {}

class CycleNode extends Node {
  async invoke() {
    
  }
}

class BatchProcessNode extends Node {
  async invoke() {
    return {

    }
  }
}

class Workflow {
  constructor(triggerNode, nodes) {
    this.triggerNode = triggerNode
    this.nodes = nodes
  }

  async run() {
    let output = await this.triggerNode.invoke()
    for await (const node of this.nodes) {
      output = await node.invoke(output)
    }
    return output
  }
}

const tools = [
  {
    type:'function',
    function:{
      name:'getCurrentTime',
      description:'获取当前时间',
      parameters:{}
    }
  },
  {
    type:'function',
    function:{
      name:'jsREPL',
      description:'执行JavaScript代码片段',
      parameters:{
        type:'object',
        properties:{
          options:{
            type:'object',
            properties:{
              code:{
                type:'string'
              }
            }
          }
        }
      }
    }
  },
  {
    type:'function',
    function:{
      name:'mul',
      description:'运行乘法运算',
      parameters:{
        type:'object',
        properties:{
          options:{
            type:'object',
            properties:{
              a:{
                type:'number'
              },
              b:{
                type:'number'
              }
            }
          }
        }
      }
    }
  },
  {
    type:'function',
    function:{
      name:'add',
      description:'运行加法运算',
      parameters:{
        type:'object',
        properties:{
          options:{
            type:'object',
            properties:{
              a:{
                type:'number'
              },
              b:{
                type:'number'
              }
            }
          }
        }
      }
    }
  },
  {
    type:'function',
    function:{
      name:'readFile',
      description:'读取文件内容',
      parameters:{
        type:'object',
        properties:{
          options:{
            type:'object',
            properties:{
              path:{
                type:'string',
                description:'文件路径'
              },
            }
          }
        }
      }
    }
  },
  {
    type:'function',
    function:{
      name:'askDatabase',
      description:'',
      parameters:{
        type:'object',
        properties:{
          options:{
            type:'object',
            properties:{
              query:{
                type:'string',
                description:''
              },
            }
          }
        }
      }
    }
  },
]

async function main() {
  const nodes = [
    new AIAgentNode(
      new ChatModelNode({
        systemMessage:'基于sqlite数据库中的`employees`表数据回答用户问题。',
        userMessage:'你好'
      }), 
      tools
    )
  ]

  const wf = new Workflow(new TriggerNode(), nodes)
  const finalOutput = await wf.run()
  console.log(finalOutput)
}

main()

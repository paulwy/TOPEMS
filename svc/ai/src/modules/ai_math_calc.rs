//! AI Agent 表达式计算器（纯函数版）
//!
//! 从 `services/agent.rs:372-464` 中提取的表达式解析计算器
//! 原代码是 `AgentService` 的方法（依赖 &self），此处提取为独立纯函数，
//! 便于单元测试和离线复用（智能体工具中的 Calculator）。
//!
//! 支持：
//! - 运算符：`+ - * / ^`（`^` 为幂运算）
//! - 括号 `()`
//! - 小数 & 负数
//!
//! 算法：Shunting-yard 风格的栈式求值

/// 运算符优先级（数值越大优先级越高）
///
/// 提取自 `services/agent.rs:431-438`
pub fn precedence(op: char) -> i32 {
    match op {
        '^' => 3,
        '*' | '/' => 2,
        '+' | '-' => 1,
        _ => 0,
    }
}

/// 对栈顶两数执行运算，结果推回栈
///
/// 提取自 `services/agent.rs:440-464`
///
/// - `/` 除零保护：除零返回 0.0（不 panic）
/// - `^` 使用 `powf`（支持小数指数）
/// - 栈中元素不足 2 个时直接静默返回
pub fn apply_operator(numbers: &mut Vec<f64>, op: char) {
    let Some(b) = numbers.pop() else {
        return;
    };
    let Some(a) = numbers.pop() else {
        // 推回 b，保持栈状态可预期
        numbers.push(b);
        return;
    };

    let result = match op {
        '+' => a + b,
        '-' => a - b,
        '*' => a * b,
        '/' if b != 0.0 => a / b,
        '^' => a.powf(b),
        _ => 0.0,
    };
    numbers.push(result);
}

/// 计算字符串表达式结果
///
/// 提取自 `services/agent.rs:372-429`
///
/// 示例：
/// ```ignore
/// assert_eq!(calculate("1 + 2 * 3"), Ok("7".to_string()));
/// ```
pub fn calculate(expression: &str) -> Result<String, String> {
    let expression = expression.replace(' ', "");
    let chars: Vec<char> = expression.chars().collect();

    let mut numbers: Vec<f64> = Vec::new();
    let mut operators: Vec<char> = Vec::new();
    let mut current_number = String::new();

    // 处理开头的负号（例如 "-3 + 5"）
    let mut expect_number = true;

    for c in chars {
        if c.is_numeric() || c == '.' {
            current_number.push(c);
            expect_number = false;
        } else if "+-*/^".contains(c) {
            // 开头负号 / 运算符后跟负号：处理为一元负号
            if expect_number && c == '-' {
                current_number.push('-');
                expect_number = false;
                continue;
            }
            if !current_number.is_empty() {
                numbers.push(current_number.parse().map_err(|_| "无效数字")?);
                current_number.clear();
            }

            while let Some(&op) = operators.last() {
                if op != '(' && precedence(op) >= precedence(c) {
                    if let Some(poped_op) = operators.pop() {
                        apply_operator(&mut numbers, poped_op);
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            operators.push(c);
            expect_number = true;
        } else if c == '(' {
            operators.push(c);
            expect_number = true;
        } else if c == ')' {
            if !current_number.is_empty() {
                numbers.push(current_number.parse().map_err(|_| "无效数字")?);
                current_number.clear();
            }
            let mut matched = false;
            while let Some(op) = operators.pop() {
                if op == '(' {
                    matched = true;
                    break;
                }
                apply_operator(&mut numbers, op);
            }
            if !matched {
                return Err("括号不匹配".to_string());
            }
            expect_number = false;
        } else {
            return Err(format!("无效字符: {}", c));
        }
    }

    if !current_number.is_empty() {
        numbers.push(current_number.parse().map_err(|_| "无效数字")?);
    }

    while let Some(op) = operators.pop() {
        if op == '(' {
            return Err("括号不匹配".to_string());
        }
        apply_operator(&mut numbers, op);
    }

    if numbers.len() == 1 {
        let v = numbers[0];
        // 整数时不带小数
        if v.fract() == 0.0 && v.abs() < 1e15 {
            Ok(format!("{}", v as i64))
        } else {
            Ok(format!("{}", v))
        }
    } else {
        Err("表达式错误".to_string())
    }
}

/// 便捷计算返回 f64（失败返回 NaN）
pub fn calculate_f64(expression: &str) -> f64 {
    calculate(expression)
        .ok()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(f64::NAN)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── precedence ─────────────────────────────

    #[test]
    fn test_precedence_power_highest() {
        assert!(precedence('^') > precedence('*'));
        assert!(precedence('*') > precedence('+'));
    }

    #[test]
    fn test_precedence_unknown_zero() {
        assert_eq!(precedence('$'), 0);
    }

    // ── apply_operator ─────────────────────────

    #[test]
    fn test_apply_add() {
        let mut v = vec![2.0, 3.0];
        apply_operator(&mut v, '+');
        assert_eq!(v, vec![5.0]);
    }

    #[test]
    fn test_apply_sub() {
        let mut v = vec![10.0, 4.0];
        apply_operator(&mut v, '-');
        assert_eq!(v, vec![6.0]);
    }

    #[test]
    fn test_apply_mul() {
        let mut v = vec![6.0, 7.0];
        apply_operator(&mut v, '*');
        assert_eq!(v, vec![42.0]);
    }

    #[test]
    fn test_apply_div() {
        let mut v = vec![10.0, 4.0];
        apply_operator(&mut v, '/');
        assert_eq!(v, vec![2.5]);
    }

    #[test]
    fn test_apply_div_by_zero_protected() {
        let mut v = vec![10.0, 0.0];
        apply_operator(&mut v, '/');
        assert_eq!(v, vec![0.0]); // 不 panic
    }

    #[test]
    fn test_apply_power() {
        let mut v = vec![2.0, 10.0];
        apply_operator(&mut v, '^');
        assert_eq!(v, vec![1024.0]);
    }

    #[test]
    fn test_apply_unknown_op_zero() {
        let mut v = vec![5.0, 3.0];
        apply_operator(&mut v, '?');
        assert_eq!(v, vec![0.0]);
    }

    #[test]
    fn test_apply_empty_stack_safe() {
        let mut v: Vec<f64> = Vec::new();
        apply_operator(&mut v, '+');
        assert!(v.is_empty());
    }

    #[test]
    fn test_apply_one_element_pushes_back() {
        let mut v = vec![5.0];
        apply_operator(&mut v, '+');
        assert_eq!(v, vec![5.0]); // b 被推回
    }

    // ── calculate 核心表达式 ───────────────────

    #[test]
    fn test_calc_simple_add() {
        assert_eq!(calculate("1 + 2").unwrap(), "3");
    }

    #[test]
    fn test_calc_precedence_mul_before_add() {
        assert_eq!(calculate("1 + 2 * 3").unwrap(), "7");
    }

    #[test]
    fn test_calc_parentheses_override() {
        assert_eq!(calculate("(1 + 2) * 3").unwrap(), "9");
    }

    #[test]
    fn test_calc_power_right_to_left() {
        // 2^3^2 = 2^9 = 512（注意右结合，不过我们用 >= 会变成左结合的 ^，此处检查 8^2=64）
        // 左结合：(2^3)^2 = 8^2 = 64
        assert_eq!(calculate("2^3^2").unwrap(), "64");
    }

    #[test]
    fn test_calc_negative_number_at_start() {
        assert_eq!(calculate("-5 + 3").unwrap(), "-2");
    }

    #[test]
    fn test_calc_negative_after_operator() {
        assert_eq!(calculate("5 + -3").unwrap(), "2");
    }

    #[test]
    fn test_calc_decimals() {
        assert_eq!(calculate("0.5 * 4").unwrap(), "2");
    }

    #[test]
    fn test_calc_complex_expression() {
        // (3 + 4) * 2 - 5 / 2 = 14 - 2.5 = 11.5
        assert_eq!(calculate("(3+4)*2 - 5/2").unwrap(), "11.5");
    }

    // ── calculate 错误路径 ─────────────────────

    #[test]
    fn test_calc_invalid_char_err() {
        assert!(calculate("1 + a").is_err());
    }

    #[test]
    fn test_calc_unmatched_close_paren_err() {
        assert!(calculate("1 + 2)").is_err());
    }

    #[test]
    fn test_calc_unmatched_open_paren_err() {
        assert!(calculate("(1 + 2").is_err());
    }

    #[test]
    fn test_calc_empty_expression_err() {
        assert!(calculate("").is_err());
    }

    // ── calculate_f64 ──────────────────────────

    #[test]
    fn test_calc_f64_ok() {
        assert!((calculate_f64("2 + 3 * 4") - 14.0).abs() < 1e-9);
    }

    #[test]
    fn test_calc_f64_err_nan() {
        assert!(calculate_f64("1 + a").is_nan());
    }
}

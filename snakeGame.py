import pygame
import random

pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption('Snake Game')
black = (0, 0, 0)
white = (255, 255, 255)
red = (255, 0, 0)
green = (0, 255, 0)
blue = (0, 0, 255)

snake_pos = [100, 50]
snake_body = [[100, 50], [90, 50], [80, 50]]
direction = 'RIGHT'
change_direction = direction

game_over = False
game_close = False
x = random.randint(1, (800 // 10)) * 10
y = random.randint(1, (600 // 10)) * 10

clock = pygame.time.Clock()

pts = 0
font = pygame.font.SysFont('comicsansms', 20)
while not game_over:
    while game_close:
        screen.fill(black)
        game_over_text = font.render(
            'Game Over! Your score is: ' + str(pts), True, red)
        screen.blit(game_over_text, (250, 250))
        pygame.display.update()
        for event in pygame.event.get():
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_q:
                    game_over = True
                    game_close = False
                if event.key == pygame.K_c:
                    snakeGame()
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_LEFT and direction != 'RIGHT':
                change_direction = 'LEFT'
            if event.key == pygame.K_RIGHT and direction != 'LEFT':
                change_direction = 'RIGHT'
            if event.key == pygame.K_UP and direction != 'DOWN':
                change_direction = 'UP'
            if event.key == pygame.K_DOWN and direction != 'UP':
                change_direction = 'DOWN'

    if change_direction == 'RIGHT' and direction != 'LEFT':
        direction = change_direction
    if change_direction == 'LEFT' and direction != 'RIGHT':
        direction = change_direction
    if change_direction == 'UP' and direction != 'DOWN':
        direction = change_direction
    if change_direction == 'DOWN' and direction != 'UP':
        direction = change_direction

    if direction == 'RIGHT':
        snake_pos[0] += 10
    if direction == 'LEFT':
        snake_pos[0] -= 10
    if direction == 'UP':
        snake_pos[1] -= 10
    if direction == 'DOWN':
        snake_pos[1] += 10

    snake_body.insert(0, list(snake_pos))
    if snake_pos[0] == x and snake_pos[1] == y:
        pts += 1
        x = random.randint(1, (800 // 10)) * 10
        y = random.randint(1, (600 // 10)) * 10
    else:
        snake_body.pop()

    if snake_pos[0] < 0 or snake_pos[0] > 800 - 10:
        game_close = True
    if snake_pos[1] < 0 or snake_pos[1] > 600 - 10:
        game_close = True

    for block in snake_body[1:]:
        if snake_pos[0] == block[0] and snake_pos[1] == block[1]:
            game_close = True

    screen.fill(black)
    for pos in snake_body:
        pygame.draw.rect(screen, green, pygame.Rect(pos[0], pos[1], 10, 10))
    pygame.draw.rect(screen, red, pygame.Rect(x, y, 10, 10))

    score_text = font.render('Score: ' + str(pts), True, white)
    screen.blit(score_text, (10, 10))
    pygame.display.update()
    clock.tick(10)


def close_game():
    pygame.quit()
    quit()


def restart_game():
    global snake_pos, snake_body, direction, x, y, pts
    snake_pos = [100, 50]
    snake_body = [[100, 50], [90, 50], [80, 50]]
    direction = 'RIGHT'
    change_direction = direction
    x = random.randint(1, (800 // 10)) * 10
    y = random.randint(1, (600 // 10)) * 10
    pts = 0


while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            close_game()
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_c:
                restart_game()
            if event.key == pygame.K_q:
                game_over = True
                game_close = False

    if game_close:
        while game_close:
            for event in pygame.event.get():
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_q:
                        game_over = True
                        game_close = False
                    if event.key == pygame.K_c:
                        restart_game()

            screen.fill(black)

            game_over_text = font.render(
                'Game Over! Your score is: ' + str(pts), True, red)
            screen.blit(game_over_text, (250, 250))

            pygame.display.update()
            clock.tick(10)
    else:
        snakeGame()
